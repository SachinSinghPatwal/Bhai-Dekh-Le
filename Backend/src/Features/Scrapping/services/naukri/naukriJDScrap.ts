import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import mongoose from "mongoose";

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

const log = Logger;
const fetchCloudinaryPdf = Cloudinary;
const getUserDataFromFile = userDataHelper;
const getAllSnapshotJobs = getAllSnapShots;

/**
 * Parsed and structured Job Description schema
 */
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

/**
 * Zod schemas for AI Resume-to-JD Evaluation
 */
export const JobRatingSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  companyName: z.string(),
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

/**
 * Selectors for extracting Job Description content across Naukri page variations
 */
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

/**
 * 1. Fetch jobs from provided argument, MongoDB, or local snapshots fallback
 */
export async function getJobsFromBackend(
  inputJobs?: JOB_DETAILS[],
): Promise<JOB_DETAILS[]> {
  if (Array.isArray(inputJobs) && inputJobs.length > 0) {
    return inputJobs;
  }

  // 1. Query MongoDB if connected
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

  // 2. Fall back to local decrypted snapshots
  const snapshotJobs = await getAllSnapshotJobs("./snapShots");
  if (snapshotJobs.length > 0) {
    log.info(
      `[Naukri JD Scrap] Retrieved ${snapshotJobs.length} jobs from local snapshots.`,
    );
    return snapshotJobs;
  }

  return [];
}

/**
 * 2. Retrieves the candidate resume as a Buffer.
 *
 * Priority order:
 *   1. LOCAL  — any *.pdf file inside Backend/data/ (highest priority, always tried first)
 *   2. REMOTE — Cloudinary or other HTTP URL stored in the user profile (soft-fail)
 *   3. JSON   — resumeLink/resumePath found inside personalDetails JSON (soft-fail)
 *
 * Cloudinary / remote sources are soft-fails: on any network or auth error we log
 * a warning and move on rather than aborting the whole pipeline.
 *
 * Returns null when no resume can be resolved so the caller can skip AI rating
 * gracefully instead of crashing the DB worker.
 */
export async function loadResumeBuffer(): Promise<{
  buffer: Buffer;
  source: string;
} | null> {
  // ─── PRIORITY 1: Local Backend/data/*.pdf ────────────────────────────────────
  const localDataDir = path.resolve(process.cwd(), "data");
  if (existsSync(localDataDir)) {
    try {
      const files = await fs.readdir(localDataDir);
      const pdfFile = files.find((f) => f.toLowerCase().endsWith(".pdf"));
      if (pdfFile) {
        const pdfPath = path.join(localDataDir, pdfFile);
        const buffer = await fs.readFile(pdfPath);
        log.info(
          `[Naukri JD Scrap] ✅ Resume loaded from local file: data/${pdfFile}`,
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

  // ─── PRIORITY 2: Remote URL from user profile ────────────────────────────────
  // Soft-fail: network / auth errors skip to next option
  const tryFetchUrl = async (
    url: string,
    label: string,
  ): Promise<{ buffer: Buffer; source: string } | null> => {
    // Try strict Cloudinary helper first
    if (url.startsWith("https://res.cloudinary.com")) {
      try {
        const buffer = await fetchCloudinaryPdf(url);
        return { buffer, source: label };
      } catch (cloudErr: any) {
        log.warn(
          `[Naukri JD Scrap] ${label} — fetchCloudinaryPdf failed (${cloudErr?.message}). ` +
            `Trying plain HTTP fallback...`,
        );
      }
    }
    // Plain HTTP fetch (also used as Cloudinary fallback)
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

  // 2a. URL from MongoDB / retrieveUserResumeLink
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

  // 2b. URL from personalDetails JSON file
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

  // ─── No resume found ─────────────────────────────────────────────────────────
  log.warn(
    `[Naukri JD Scrap] ⚠️  No resume PDF found. ` +
      `Place a PDF inside Backend/data/ to enable AI resume rating.`,
  );
  return null;
}

/**
 * 3. Scrapes full Job Descriptions using Playwright stealth session
 *    and saves consolidated results to Backend/src/Features/Scrapping/data/allJdDescriptions.private.json
 */
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

  // Initialize stealth Playwright session using the abstract helper
  const { browser, page } = await createScrapingSession(workerId);

  const dataDir = path.resolve(process.cwd(), CLIENT_DATA_FOLDER_NAME);
  await fs.mkdir(dataDir, { recursive: true });

  try {
    for (let i = 0; i < validJobs.length; i++) {
      const job = validJobs[i];

      // Normalize JD URL
      const fullUrl = job.jdURL.startsWith("http")
        ? job.jdURL
        : `${NAUKRI_BASE_URL.replace(/\/$/, "")}/${job.jdURL.replace(/^\//, "")}`;

      log.info(
        `[${workerId}] [${i + 1}/${validJobs.length}] Navigating to JD: ${job.title} (${job.jobId}) -> ${fullUrl}`,
      );

      try {
        await page.goto(fullUrl, {
          waitUntil: "domcontentloaded",
          timeout: GENERAL_TIMEOUT,
        });

        await waitForPageReady(page, 4_000);

        // Search for JD container in page
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

        // Fallback to body content if specific container not found
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

        log.success(
          `[${workerId}] Scraped JD for ${job.jobId} (${containerText.length} chars)`,
        );

        // Friendly jitter delay between navigations (controlled via SCRAPING_JITTER)
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

        // If page failed but we have existing job data, build best-effort JD record
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

    // Persist consolidated batch file in Backend/src/Features/Scrapping/data
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

/**
 * 4. Evaluates Candidate Resume against all Scraped Job Descriptions using Gemini AI
 */
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
    tagsAndSkills: jd.tagsAndSkills,
    description: jd.descriptionText.slice(0, 1500),
  }));

  const promptText = `
You are a strict job-matching engine. Analyze the candidate profile against the provided job listings and return ONLY highly relevant jobs.

**Filtering Rules**
1. Include only jobs with a match score of **75/100 or higher**.
2. Exclude jobs requiring mandatory skills the candidate lacks, unrelated technology stacks, or experience significantly beyond the candidate's experience.
3. Prioritize alignment with the candidate's actual skills, experience level, complete prefix with https://naurki.com/ and target role.
4. Never inflate match scores. A shared framework or generic skill alone does not establish a strong match.
5. If no jobs meet the criteria, return "No highly matched jobs found." Never lower the threshold to fill the results.

**Output Requirements**
For each qualifying job, return only:

[#1] Job Title | Company | Match: XX/100
**Matching Skills:** Up to 5 most relevant skills.
**Key Gap:** Only the most important missing requirement, if any. Write "None significant" when appropriate.
**Verdict:** One concise sentence explaining why the job is a strong fit.

**Conciseness Rules**
- Sort by match score, highest first.
- Remove low-match, moderate-match, and unsuitable jobs entirely.
- Do not repeat the candidate's skills across multiple sections unnecessarily.
- Do not include lengthy analysis, application advice, generic recommendations, introductions, conclusions, or summaries.
- Preserve job titles, company names, and job IDs when available.
- Use only information supported by the candidate profile and job listing.
- If a match score is provided by another system, treat it as an estimate and independently check whether the job meets the filtering rules.

Return the qualifying jobs in the specified format. And Above of All provide common skills asked by company in their skills and jd for today's collected jobs

Also provide an 'overallSummary' comparing the candidate's profile against this batch of opportunities.

Job Descriptions to evaluate:
${JSON.stringify(jobSummariesForPrompt, null, 2)}
`;

  log.info(
    `[Naukri JD Scrap] Sending resume and ${jds.length} JDs to Gemini AI (gemini-3.8-flash)...`,
  );

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
  return BatchJobRatingSchema.parse(rawJson);
}

/**
 * 5. Prints formatted rating dashboard to the terminal
 */
export function displayRatingReportOnTerminal(
  ratingResult: BatchJobRating,
  resumeSource: string,
): void {
  const line = "=".repeat(85);
  const subLine = "-".repeat(85);

  console.log("\n" + line);
  console.log("🎯  GEMINI AI RESUME vs NAUKRI JOB DESCRIPTIONS RATING REPORT");
  console.log(line);
  console.log(`📄 Candidate Resume Source: ${resumeSource}`);
  console.log(
    `📊 Total Opportunities Evaluated: ${ratingResult.ratedJobs.length}`,
  );
  console.log(`💡 Profile Summary: ${ratingResult.overallSummary}`);
  console.log(subLine);

  ratingResult.ratedJobs.forEach((job, index) => {
    const scoreColor =
      job.matchScore >= 80 ? "🟢" : job.matchScore >= 60 ? "🟡" : "🔴";

    console.log(
      `\n[#${index + 1}] ${job.title} | ${job.companyName} (Job ID: ${job.jobId})`,
    );
    console.log(
      `    ${scoreColor} Match Score: ${job.matchScore}/100 [${job.fitVerdict}]`,
    );
    console.log(
      `    ✅ Matching Skills: ${job.matchingSkills.join(", ") || "None highlighted"}`,
    );
    console.log(
      `    ⚠️  Missing / Gap Skills: ${job.missingSkills.join(", ") || "None"}`,
    );
    console.log(`    📝 Analysis: ${job.summary}`);
    console.log(`    💡 Advice: ${job.recommendation}`);
  });

  console.log("\n" + line + "\n");
}

/**
 * Main Orchestrator:
 * 1. Called immediately after DB workers store data in MongoDB.
 * 2. Gets all jobs from backend and extracts jdURL.
 * 3. Launches Playwright via abstract createScrapingSession.
 * 4. Navigates to each JD page, extracts container content, and saves to Backend/src/Features/Scrapping/data/allJdDescriptions.private.json.
 * 5. Loads resume from Backend/data or Cloudinary.
 * 6. Prompts Gemini AI to rate resume against all JDs.
 * 7. Prints detailed rating list on terminal and returns the result.
 *
 * @param inputJobs - Optional job list if passed directly from DB worker
 * @param workerId  - Identifier for the worker running this job
 */
export default async function naukriJDScrap(
  inputJobs?: JOB_DETAILS[],
  workerId: string = "jd-scraper",
): Promise<JobRating[]> {
  try {
    log.info(`[${workerId}] naukriJDScrap started.`);

    // 1. Get all jobs from backend
    const jobs = await getJobsFromBackend(inputJobs);
    if (!jobs || jobs.length === 0) {
      log.warn(
        `[${workerId}] No jobs found in backend or snapshots to scrape.`,
      );
      return [];
    }

    log.info(`[${workerId}] Processing ${jobs.length} jobs for JD scraping.`);

    // 2. Scrape JD pages and save consolidated to Backend/src/Features/Scrapping/data/allJdDescriptions.private.json
    const scrapedJds = await scrapeJobDescriptions(jobs, workerId);
    if (scrapedJds.length === 0) {
      log.warn(`[${workerId}] No job descriptions could be scraped.`);
      return [];
    }

    // 3. Load candidate resume — local Backend/data/*.pdf is top priority
    const resumeInfo = await loadResumeBuffer();
    if (!resumeInfo) {
      log.warn(
        `[${workerId}] No resume found — skipping AI rating. ` +
          `Drop a PDF into Backend/data/ to enable resume scoring.`,
      );
      return [];
    }
    const { buffer: resumeBuffer, source: resumeSource } = resumeInfo;

    // 4. Rate resume against JDs using Gemini GenAI
    log.info(
      `[${workerId}] Rating candidate resume against ${scrapedJds.length} JDs...`,
    );
    const ratingResult = await rateResumeAgainstJDs(scrapedJds, resumeBuffer);

    // 5. Output rating list to backend terminal
    displayRatingReportOnTerminal(ratingResult, resumeSource);
    log.success(
      `[${workerId}] JD Scrape and Resume Evaluation completed successfully for ${ratingResult.ratedJobs.length} jobs.`,
    );

    return ratingResult.ratedJobs;
  } catch (error: any) {
    log.error(
      `[${workerId}] Error in naukriJDScrap: ${error?.message ?? error}`,
    );
    throw error;
  }
}
