import { Logger, getAllSnapShots } from "../../index.js";

export default async function initialFetch(
  composedURL: string,
  workerId: string,
): Promise<{ totalPages: number; jobs: any[] }> {
  try {
    const response = await fetch(composedURL);

    if (!response.ok) {
      throw new Error(
        `JobFound server responded with HTTP ${response.status} (${response.statusText})`,
      );
    }

    const data = await response.json();
    const { jobs, total: totalPages = 0 } = data || {};

    if (!Array.isArray(jobs) || jobs.length === 0) {
      Logger.warn(`[${workerId}] No initial jobs returned from JobFound.`);
      return { totalPages: 0, jobs: [] };
    }

    return { totalPages, jobs };
  } catch (fetchError: any) {
    Logger.error(
      `[${workerId}] Error during initialFetch for JobFound: ${fetchError.message}`,
    );

    // Fall back to local snapshots saved for JobFound if network fails
    const fallbackJobs = await getAllSnapShots("jobFound");
    if (fallbackJobs.length > 0) {
      Logger.info(
        `[${workerId}] Retrieved ${fallbackJobs.length} jobs from local snapshots (jobFound).`,
      );
      return { totalPages: fallbackJobs.length, jobs: fallbackJobs };
    }

    throw new Error(
      `Error from [${workerId}] during initialFetch | Reason: ${fetchError.message}`,
    );
  }
}
