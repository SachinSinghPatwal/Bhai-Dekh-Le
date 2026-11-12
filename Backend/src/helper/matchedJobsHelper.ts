import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { NAUKRI_BASE_URL } from "../constants.js";
import log from "../utility/Logger.js";

export const MATCHED_JOBS_PATH = path.resolve(
  process.cwd(),
  "src/Features/Scrapping/data/matchedJobs.private.json",
);

export interface MatchedJobRecord {
  jobId: string;
  title: string;
  companyName: string;
  jdURL: string;
  keySkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  matchScore: number | null;
  fitVerdict: string;
  aiSummary: string;
  aiRecommendation: string;
  applied: boolean;
  aiEvaluatedAt: string | Date | null;
  minExp: string;
  maxExp: string;
  placeholders: Record<string, string>[];
  createdDate: number | null;
}

export function normalizeJobUrl(jdURL?: string): string {
  const raw = String(jdURL ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = NAUKRI_BASE_URL.replace(/\/$/, "");
  return `${base}/${raw.replace(/^\/+/, "")}`;
}

function splitSkillEntries(input: unknown): string[] {
  if (!input) return [];
  const items = Array.isArray(input) ? input : [input];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (typeof item !== "string") continue;
    for (const part of item.split(",")) {
      const clean = part.trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(clean);
      }
    }
  }
  return result;
}

export function normalizeSkills(
  matchingSkills?: unknown,
  tagsAndSkills?: unknown,
): string[] {
  const matched = splitSkillEntries(matchingSkills);
  if (matched.length > 0) return matched;
  return splitSkillEntries(tagsAndSkills);
}

export function formatMatchedJobForClient(
  job: Record<string, any>,
): MatchedJobRecord {
  const matchingSkills = splitSkillEntries(job.matchingSkills);
  const missingSkills = splitSkillEntries(job.missingSkills);
  const keySkills =
    matchingSkills.length > 0
      ? matchingSkills
      : splitSkillEntries(job.keySkills ?? job.tagsAndSkills);

  return {
    jobId: String(job.jobId ?? ""),
    title: String(job.title ?? ""),
    companyName: String(job.companyName ?? ""),
    jdURL: normalizeJobUrl(job.jdURL),
    keySkills,
    matchingSkills,
    missingSkills,
    matchScore: typeof job.matchScore === "number" ? job.matchScore : null,
    fitVerdict: String(job.fitVerdict ?? ""),
    aiSummary: String(job.aiSummary ?? job.summary ?? ""),
    aiRecommendation: String(
      job.aiRecommendation ?? job.recommendation ?? "",
    ),
    applied: Boolean(job.applied),
    aiEvaluatedAt: job.aiEvaluatedAt ?? null,
    minExp: String(job.minExp ?? ""),
    maxExp: String(job.maxExp ?? ""),
    placeholders: Array.isArray(job.placeholders) ? job.placeholders : [],
    createdDate: typeof job.createdDate === "number" ? job.createdDate : null,
  };
}

export async function readMatchedJobsFromFile(): Promise<MatchedJobRecord[]> {
  if (!existsSync(MATCHED_JOBS_PATH)) return [];
  try {
    const raw = await fs.readFile(MATCHED_JOBS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => formatMatchedJobForClient(item));
  } catch (err) {
    log.warn(`[MatchedJobsHelper] Failed reading ${MATCHED_JOBS_PATH}:`, err);
    return [];
  }
}

export async function saveMatchedJobsToFile(
  ratedJobs: Record<string, any>[],
): Promise<void> {
  if (!Array.isArray(ratedJobs) || ratedJobs.length === 0) return;

  const existing = await readMatchedJobsFromFile();
  const byId = new Map<string, MatchedJobRecord>();

  for (const job of existing) {
    if (job.jobId) byId.set(job.jobId, job);
  }

  const nowIso = new Date().toISOString();
  for (const rj of ratedJobs) {
    const jobId = String(rj.jobId ?? "").trim();
    if (!jobId) continue;
    const prev = byId.get(jobId);
    const formatted = formatMatchedJobForClient({
      ...prev,
      ...rj,
      applied: prev ? prev.applied : Boolean(rj.applied),
      aiEvaluatedAt: rj.aiEvaluatedAt ?? nowIso,
    });
    byId.set(jobId, formatted);
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0),
  );

  await fs.mkdir(path.dirname(MATCHED_JOBS_PATH), { recursive: true });
  await fs.writeFile(
    MATCHED_JOBS_PATH,
    JSON.stringify(merged, null, 2),
    "utf-8",
  );
}

export async function updateAppliedInMatchedJobsFile(
  updates: Array<{ jobId: string; applied: boolean }>,
): Promise<number> {
  if (!existsSync(MATCHED_JOBS_PATH) || updates.length === 0) return 0;
  const existing = await readMatchedJobsFromFile();
  if (existing.length === 0) return 0;

  const updateMap = new Map(updates.map((u) => [u.jobId, Boolean(u.applied)]));
  let changed = 0;

  const next = existing.map((job) => {
    if (!updateMap.has(job.jobId)) return job;
    changed++;
    return { ...job, applied: updateMap.get(job.jobId)! };
  });

  if (changed > 0) {
    await fs.writeFile(
      MATCHED_JOBS_PATH,
      JSON.stringify(next, null, 2),
      "utf-8",
    );
  }
  return changed;
}

