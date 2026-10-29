import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import mongoose from "mongoose";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import {
  Logger,
  createScrapingSession,
  waitForPageReady,
  JOB_DETAILS,
  JobModel,
  NAUKRI_BASE_URL,
  CLIENT_DATA_FOLDER_NAME,
  GENERAL_TIMEOUT,
  Cloudinary,
  retrieveUserResumeLink,
  userDataHelper,
  getAllSnapShots,
  SCRAPING_JITTER,
} from "../../index.js";
import ScheduleAiEvaluation from "../../../MessageQueues/service/producer/ScheduleAiEvaluation.js";
import {
  startCustomBrailleBar,
  startSpinningLoader,
} from "../../../../utility/TerminalProgress.js";

const log = Logger;
const fetchCloudinaryPdf = Cloudinary;
const getUserDataFromFile = userDataHelper;
const getAllSnapshotJobs = getAllSnapShots;

export interface ScrapedJobDescription {
  jobId: string;
  title: string;
  companyName: string;
  jdURL: string;
  tagsAndSkills: string[];
  descriptionText: string;
  descriptionHtml: string;
  salaryDetails?: Record<string, unknown>;
  experience?: string;
  scrapedAt: string;
}

export const JobRatingSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  companyName: z.string(),
  jdURL: z.string(),
  matchScore: z.number().min(0).max(100),
  fitVerdict: z.enum([
    "Strong Match",
    "Moderate Match",
    "Low Match",
    "Not a Fit",
  ]),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  summary: z.string(),
  recommendation: z.string(),
});

export const BatchJobRatingSchema = z.object({
  overallSummary: z.string(),
  ratedJobs: z.array(JobRatingSchema),
});

export type JobRating = z.infer<typeof JobRatingSchema>;
export type BatchJobRating = z.infer<typeof BatchJobRatingSchema>;

const JD_CONTAINER_SELECTORS = [
  ".styles_JDC__dang-inner-html__h0K4t",
  "[class*='styles_JDC__dang-inner-html']",
  "section.job-desc-container",
  ".styles_job-desc-container__txpYf",
  "[class*='job-desc-container']",
  ".dang-inner-html",
  "section[class*='styles_job-description']",
  "[class*='jobDescription']",
  ".jd-container",
  "article",
  "main",
];

export async function getJobsFromBackend(
  inputJobs?: JOB_DETAILS[],
): Promise<JOB_DETAILS[]> {
  if (Array.isArray(inputJobs) && inputJobs.length > 0) {
    return inputJobs;
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const dbJobs = (await JobModel.find(
        {},
      ).lean()) as unknown as JOB_DETAILS[];
      if (dbJobs && dbJobs.length > 0) {
        log.info(
          `[Naukri JD Scrap] Retrieved ${dbJobs.length} jobs from MongoDB.`,
        );
        return dbJobs;
      }
    } catch (err) {
      log.warn(`[Naukri JD Scrap] Failed querying MongoDB: ${err}`);
    }
  }

  const snapshotJobs = await getAllSnapshotJobs("naukri");
  if (snapshotJobs.length > 0) {
    log.info(
      `[Naukri JD Scrap] Retrieved ${snapshotJobs.length} jobs from local snapshots (naukri).`,
    );
    return snapshotJobs;
  }

  return [];
}

export async function loadResumeBuffer(): Promise<{
  buffer: Buffer;
  source: string;
} | null> {
  const localDataDir = path.resolve(process.cwd(), "data");
  if (existsSync(localDataDir)) {
    try {
      const files = await fs.readdir(localDataDir);
      const pdfFile = files.find((f) => f.toLowerCase().endsWith(".pdf"));
      if (pdfFile) {
        const pdfPath = path.join(localDataDir, pdfFile);
        const buffer = await fs.readFile(pdfPath);
        log.info(
          `[Naukri JD Scrap] Resume loaded from local file: data/${pdfFile}`,
        );
        return { buffer, source: `local:data/${pdfFile}` };
      }
    } catch (localErr: any) {
      log.warn(
        `[Naukri JD Scrap] Could not read Backend/data directory: ${localErr?.message}`,
      );
    }
  } else {
    log.debug(
      `[Naukri JD Scrap] Backend/data directory not found — skipping local PDF lookup.`,
    );
  }

  const tryFetchUrl = async (
    url: string,
    label: string,
  ): Promise<{ buffer: Buffer; source: string } | null> => {
    if (url.startsWith("https://res.cloudinary.com")) {
      try {
        const buffer = await fetchCloudinaryPdf(url);
        return { buffer, source: label };
      } catch (cloudErr: any) {
        log.warn(
          `[Naukri JD Scrap] ${label} — fetchCloudinaryPdf failed (${cloudErr?.message}). Trying plain HTTP fallback...`,
        );
      }
    }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        log.warn(
          `[Naukri JD Scrap] ${label} — plain fetch failed: HTTP ${res.status} ${res.statusText}. Skipping.`,
        );
        return null;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, source: `${label}_fallback` };
    } catch (fetchErr: any) {
      log.warn(
        `[Naukri JD Scrap] ${label} — fetch threw: ${fetchErr?.message}. Skipping.`,
      );
      return null;
    }
  };

  try {
    const resumeLink = await retrieveUserResumeLink();
    if (resumeLink) {
      log.info(`[Naukri JD Scrap] Trying profile resume link: ${resumeLink}`);

      if (
        resumeLink.startsWith("http://") ||
        resumeLink.startsWith("https://")
      ) {
        const result = await tryFetchUrl(resumeLink, "cloudinary");
        if (result) return result;
      } else if (existsSync(resumeLink)) {
        const buffer = await fs.readFile(resumeLink);
        return { buffer, source: `local_path:${resumeLink}` };
      }
    }
  } catch (linkErr: any) {
    log.warn(
      `[Naukri JD Scrap] retrieveUserResumeLink error: ${linkErr?.message}`,
    );
  }

  try {
    const userData = await getUserDataFromFile();
    const linkFromJson =
      userData?.personalDetails?.resumeLink ||
      userData?.personalDetails?.resumePath;

    if (linkFromJson) {
      log.info(
        `[Naukri JD Scrap] Trying JSON file resume link: ${linkFromJson}`,
      );

      if (
        linkFromJson.startsWith("http://") ||
        linkFromJson.startsWith("https://")
      ) {
        const result = await tryFetchUrl(linkFromJson, "cloudinary_json");
        if (result) return result;
      } else if (existsSync(linkFromJson)) {
        const buffer = await fs.readFile(linkFromJson);
        return { buffer, source: `local_path:${linkFromJson}` };
      }
    }
  } catch (jsonErr: any) {
    log.warn(
      `[Naukri JD Scrap] getUserDataFromFile error: ${jsonErr?.message}`,
    );
  }

  log.warn(
    `[Naukri JD Scrap] No resume PDF found. Place a PDF inside Backend/data/ to enable AI resume rating.`,
  );
  return null;
}

export async function scrapeJobDescriptions(
  jobs: JOB_DETAILS[],
  workerId: string = "jd-scraper-worker",
): Promise<ScrapedJobDescription[]> {
  const scrapedJds: ScrapedJobDescription[] = [];
  const validJobs = jobs.filter(
    (j) => j.jdURL && typeof j.jdURL === "string" && j.jdURL.trim() !== "",
  );

  if (validJobs.length === 0) {
    log.warn(`[${workerId}] No jobs with valid jdURL found to scrape.`);
    return scrapedJds;
  }

  log.info(
    `[${workerId}] Starting Playwright JD scraping for ${validJobs.length} jobs...`,
  );

  const jdSessionLoader = startSpinningLoader(
    `[${workerId}] Initializing JD scraping session...`,
  );
  let browser;
  let page;
  try {
    const session = await createScrapingSession(workerId);
    browser = session.browser;
    page = session.page;
    jdSessionLoader.stop(`[${workerId}] JD scraping session active.`);
  } catch (sessionErr: any) {
    jdSessionLoader.fail(
      `[${workerId}] JD session initialization failed: ${sessionErr?.message ?? sessionErr}`,
    );
    throw sessionErr;
  }

  const dataDir = path.resolve(process.cwd(), CLIENT_DATA_FOLDER_NAME);
  await fs.mkdir(dataDir, { recursive: true });

  const jdBar = startCustomBrailleBar(
    0,
    validJobs.length,
    `[${workerId}] Scraping JDs`,
    24,
    `${workerId}-jds`,
  );

  try {
    for (let i = 0; i < validJobs.length; i++) {
      const job = validJobs[i];

      jdBar.update(i + 1, validJobs.length);

      const fullUrl = job.jdURL.startsWith("http")
        ? job.jdURL
        : `${NAUKRI_BASE_URL.replace(/\/$/, "")}/${job.jdURL.replace(/^\//, "")}`;
      try {
        await page.goto(fullUrl, {
          waitUntil: "domcontentloaded",
          timeout: GENERAL_TIMEOUT,
        });

        await waitForPageReady(page, 4_000);

        let containerText = "";
        let containerHtml = "";

        for (const selector of JD_CONTAINER_SELECTORS) {
          const locator = page.locator(selector).first();
          if ((await locator.count()) > 0) {
            const text = (await locator.innerText()).trim();
            if (text.length > 50) {
              containerText = text;
              containerHtml = (await locator.innerHTML()).trim();
              break;
            }
          }
        }

        if (!containerText) {
          const bodyText = await page.locator("body").innerText();
          containerText = bodyText.slice(0, 5000).trim();
          containerHtml = "<div>fallback_extracted_from_body</div>";
        }

        const jdRecord: ScrapedJobDescription = {
          jobId: job.jobId,
          title: job.title,
          companyName: job.companyName,
          jdURL: fullUrl,
          tagsAndSkills: job.tagsAndSkills ?? [],
          descriptionText: containerText,
          descriptionHtml: containerHtml,
          salaryDetails: job.salaryDetails,
          experience: `${job.minExp || ""}-${job.maxExp || ""} years`.trim(),
          scrapedAt: new Date().toISOString(),
        };

        scrapedJds.push(jdRecord);

        if (i < validJobs.length - 1) {
          const delay =
            Math.floor(Math.random() * SCRAPING_JITTER.jdScrapMaxJitter) +
            SCRAPING_JITTER.jdScrapBaseDelay;
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      } catch (pageErr: any) {
        log.warn(
          `[${workerId}] Failed scraping JD for jobId ${job.jobId}: ${pageErr.message}`,
        );

        const fallbackJdRecord: ScrapedJobDescription = {
          jobId: job.jobId,
          title: job.title,
          companyName: job.companyName,
          jdURL: fullUrl,
          tagsAndSkills: job.tagsAndSkills ?? [],
          descriptionText: job.JD || `${job.title} at ${job.companyName}`,
          descriptionHtml: "",
          salaryDetails: job.salaryDetails,
          scrapedAt: new Date().toISOString(),
        };

        scrapedJds.push(fallbackJdRecord);
      }
    }

    jdBar.stop();

    const batchFilePath = path.join(dataDir, "allJdDescriptions.private.json");
    await fs.writeFile(
      batchFilePath,
      JSON.stringify(scrapedJds, null, 2),
      "utf-8",
    );
    log.info(
      `[${workerId}] Consolidated ${scrapedJds.length} JDs saved to ${CLIENT_DATA_FOLDER_NAME}/allJdDescriptions.private.json`,
    );
  } finally {
    await browser.close().catch(() => {});
  }

  return scrapedJds;
}

export async function rateResumeAgainstJDs(
  jds: ScrapedJobDescription[],
  resumeBuffer: Buffer,
): Promise<BatchJobRating> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  const jobSummariesForPrompt = jds.map((jd, idx) => ({
    index: idx + 1,
    jobId: jd.jobId,
    title: jd.title,
    companyName: jd.companyName,
    jdURL: jd.jdURL,
    tagsAndSkills: jd.tagsAndSkills,
    description: jd.descriptionText.slice(0, 1500),
  }));

  const promptText = `
You are a strict job-matching engine. Analyze the candidate profile against the provided job listings and return ONLY highly relevant jobs.

**Filtering Rules**
1. Include only jobs with a match score of **75/100 or higher** (matchScore >= 75).
2. Exclude jobs requiring mandatory skills the candidate lacks, unrelated technology stacks, or experience significantly beyond the candidate's experience.
3. Prioritize alignment with the candidate's actual skills, experience level, and target role.
4. For every qualifying job, include the direct job listing link (jdURL) exactly as provided in the input.
5. Never inflate match scores. A shared framework or generic skill alone does not establish a strong match.
6. If no jobs meet the criteria, return "No highly matched jobs found." Never lower the threshold to fill the results.

**Output Requirements**
For each qualifying job with matchScore >= 75:
- jobId: The exact Job ID
- title: Job Title
- companyName: Company Name
- jdURL: The direct job link / URL prefixed witht he plateform base URL
- matchScore: Numerical score >= 75
- fitVerdict: Verdict category ("Strong Match" or "Moderate Match")
- matchingSkills: Up to 5 most relevant matching skills
- missingSkills: Missing or gap skills
- summary: Concise explanation of why the candidate fits this job
- recommendation: Tailored application advice

**Conciseness Rules**
- Sort by match score, highest first.
- Remove low-match, moderate-match (< 75), and unsuitable jobs entirely.
- Do not repeat the candidate's skills across multiple sections unnecessarily.
- Do not include lengthy analysis, application advice, generic recommendations, introductions, conclusions, or summaries.
- Preserve job titles, company names, URLs, and job IDs exactly as provided.
- Use only information supported by the candidate profile and job listing.

Return the qualifying jobs in the specified format. And Above of All provide common skills asked by company in their skills and jd for today's collected jobs

Also provide an 'overallSummary' comparing the candidate's profile against this batch of opportunities.

Job Descriptions to evaluate:
${JSON.stringify(jobSummariesForPrompt, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: resumeBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          overallSummary: { type: "STRING" },
          ratedJobs: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                jobId: { type: "STRING" },
                title: { type: "STRING" },
                companyName: { type: "STRING" },
                jdURL: { type: "STRING" },
                matchScore: { type: "NUMBER" },
                fitVerdict: {
                  type: "STRING",
                  enum: [
                    "Strong Match",
                    "Moderate Match",
                    "Low Match",
                    "Not a Fit",
                  ],
                },
                matchingSkills: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
                missingSkills: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
                summary: { type: "STRING" },
                recommendation: { type: "STRING" },
              },
              required: [
                "jobId",
                "title",
                "companyName",
                "jdURL",
                "matchScore",
                "fitVerdict",
                "matchingSkills",
                "missingSkills",
                "summary",
                "recommendation",
              ],
            },
          },
        },
        required: ["overallSummary", "ratedJobs"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response for JD resume rating");
  }

  const rawJson = JSON.parse(response.text);
  const parsed = BatchJobRatingSchema.parse(rawJson);
  const jdsById = new Map(jds.map((j) => [j.jobId, j.jdURL]));

  parsed.ratedJobs = parsed.ratedJobs
    .filter((job) => job.matchScore >= 75)
    .map((job) => ({
      ...job,
      jdURL: jdsById.get(job.jobId) || job.jdURL,
    }));

  return parsed;
}

export function displayRatingReportOnTerminal(
  ratingResult: BatchJobRating,
  resumeSource: string,
): void {
  const line = "=".repeat(85);
  const subLine = "-".repeat(85);

  console.log("\n" + line);
  console.log("GEMINI AI RESUME vs NAUKRI JOB DESCRIPTIONS RATING REPORT");
  console.log(`Resume Evaluated: ${resumeSource}`);
  console.log(line);
  console.log(`Profile Summary: ${ratingResult.overallSummary}`);
  console.log(subLine);

  ratingResult.ratedJobs.forEach((job, index) => {
    const scoreColor =
      job.matchScore >= 80 ? "Match" : job.matchScore >= 60 ? "Moderate" : "Low";

    console.log(
      `\n[#${index + 1}] ${job.title} | ${job.companyName} (Job ID: ${job.jobId})`,
    );
    if (job.jdURL) {
      console.log(`    Link: ${job.jdURL}`);
    }
    console.log(
      `    ${scoreColor} Score: ${job.matchScore}/100 [${job.fitVerdict}]`,
    );
    console.log(
      `    Matching Skills: ${job.matchingSkills.join(", ") || "None highlighted"}`,
    );
    console.log(
      `    Missing / Gap Skills: ${job.missingSkills.join(", ") || "None"}`,
    );
    console.log(`    Analysis: ${job.summary}`);
    console.log(`    Advice: ${job.recommendation}`);
  });

  console.log("\n" + line + "\n");
}

export default async function naukriJDScrap(
  inputJobs?: JOB_DETAILS[],
  workerId: string = "jd-scraper",
): Promise<JobRating[]> {
  try {
    log.info(`[${workerId}] naukriJDScrap started.`);

    const jobs = await getJobsFromBackend(inputJobs);
    if (!jobs || jobs.length === 0) {
      log.warn(
        `[${workerId}] No jobs found in backend or snapshots to scrape.`,
      );
      return [];
    }

    log.info(`[${workerId}] Processing ${jobs.length} jobs for JD scraping.`);

    const scrapedJds = await scrapeJobDescriptions(jobs, workerId);
    if (scrapedJds.length === 0) {
      log.warn(`[${workerId}] No job descriptions could be scraped.`);
      return [];
    }

    await ScheduleAiEvaluation(scrapedJds, workerId);
    log.success(
      `[${workerId}] Scraped ${scrapedJds.length} JDs and forwarded to AI Evaluation queue.`,
    );

    return [];
  } catch (error: any) {
    log.error(
      `[${workerId}] Error in naukriJDScrap: ${error?.message ?? error}`,
    );
    throw error;
  }
}
