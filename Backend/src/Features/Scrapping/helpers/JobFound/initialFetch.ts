import { Logger } from "../../index.js";

export default async function initialFetch(
  composedURL: string,
  workerId: string,
): Promise<Record<string, any>> {
  try {
    const response = await fetch(composedURL);

    const { jobs, total: totalPages } = await response.json();

    if (!Array.isArray(jobs) || jobs.length === 0) {
      Logger.warn(`[${workerId}] No initial jobs returned from JobFound.`);
      return [];
    }

    return { totalPages, jobs };
  } catch (fetchError: any) {
    throw new Error(
      `Error from [${workerId}] during initialFetch | Reason: ${fetchError.message}`,
    );
  }
}
