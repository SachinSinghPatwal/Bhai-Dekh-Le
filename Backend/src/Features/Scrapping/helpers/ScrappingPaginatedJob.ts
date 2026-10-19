import {
  JOB_DETAILS,
  RequestParams,
  Logger,
  SaveSnapShots,
  Fetch,
  RateLimitingError,
  getAllSnapShots,
} from "../index.js";
import { setIterativePaginationParams } from "./setIterativePaginationParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Partial<RequestParams> {
  workerId: string;
  endPage: number;
  initialPage: number;
  initialJobs: JOB_DETAILS[];
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  workerId,
  initialPage,
  initialJobs,
  endPage,
}: SCRAPPING_PAGINATED_JOBS): Promise<any> {
  let unSortedJobs = [];

  /*
    Intial request interception provide body and no of total jobs exist
    */
  if (Array.isArray(initialJobs) && initialJobs.length > 0) {
    unSortedJobs.push(...initialJobs);
  }

  for (let i = initialPage; i < endPage; i++) {
    // Pattern-based adaptive jitter:
    if (i > initialPage) {
      // Periodic breather every 15 pages to reset Naukri's sliding rate-limit counter
      if ((i - initialPage) % 15 === 0) {
        const breather = Math.floor(Math.random() * 5000) + 8000; // 8.0s - 13.0s
        Logger.debug(
          `[${workerId}] Periodic breather: Waiting ${(breather / 1000).toFixed(1)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, breather));
      }

      // Adaptive jitter: 3.5s - 6.0s early on, 4s - 7.0s after page 10
      const baseJitter = i > initialPage + 8 ? 4000 : 3000;
      const pageJitter = Math.floor(Math.random() * 2500) + baseJitter;
      await new Promise((resolve) => setTimeout(resolve, pageJitter));
    }

    setIterativePaginationParams(url as URL, i);
    Logger.debug(`[${workerId}] Scraping page ${i}...`);

    let response: JOB_DETAILS[];
    try {
      response = (await Fetch({
        url,
        headers,
        request,
      })) as JOB_DETAILS[];
    } catch (fetchError: any) {
      Logger.debug("snapShotting the jobs before throwing error");

      if (unSortedJobs.length > 0) {
        await SaveSnapShots(unSortedJobs).catch((err) => {
          Logger.error(
            `[${workerId}] Error while saving snapshot Reason: ${err.message}`,
          );
        });
      }

      throw new RateLimitingError(
        `Error from [${workerId}] last page was [[${i}]] total pages completed ${i - initialPage} | Reason stopped: ${fetchError.message}`,
        i,
      );
    }

    if (!Array.isArray(response) || response.length === 0) {
      throw new Error(
        `[${workerId}] cannot iterate over the jobs , Jobs are not iteratable`,
      );
    }
    // Checking early once we reach jobs older than 1 day
    const jobAge = Number(
      String(response[0]?.footerPlaceholderLabel ?? "")
        .split(" ")[0]
        .replace("+", ""),
    );

    const isOlderThanLimit = !isNaN(jobAge) && jobAge > 1;

    if (isOlderThanLimit) {
      Logger.success(
        `[${workerId}] Reached end of fresh jobs at page ${i}. Stopping Scrapping and returning Data.`,
      );
      let consolidatingSnapshotJobs = await getAllSnapShots("./snapShots");
      unSortedJobs.push(...consolidatingSnapshotJobs);
      return unSortedJobs;
    }
    unSortedJobs.push(...response);
  }
  return unSortedJobs;
}
