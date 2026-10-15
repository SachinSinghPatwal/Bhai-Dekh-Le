import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import log from "../../../utility/Logger.js";
import saveSnapShots from "../../../helper/SaveSnapShots.js";
import GetAllJobs from "../utility/Fetch.js";
import { RateLimitError } from "../utility/playwright/RateLimitingError.js";
import { setIterativePaginationParams } from "./setIterativePaginationParams.js";
import { getAllSnapshotJobs } from "../../../helper/getAllSnapShots.js";

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
        log.debug(
          `[${workerId}] Periodic breather: Waiting ${(breather / 1000).toFixed(1)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, breather));
      }

      // Adaptive jitter: 3.5s - 6.0s early on, 4s - 7.0s after page 10
      const baseJitter = i > initialPage + 8 ? 4000 : 3000;
      const pageJitter = Math.floor(Math.random() * 2500) + baseJitter;
      // log.debug(
      //   `[${workerId}] Waiting ${(pageJitter / 1000).toFixed(1)}s before scraping page ${i}...`,
      // );
      await new Promise((resolve) => setTimeout(resolve, pageJitter));
    }

    setIterativePaginationParams(url as URL, i);
    log.debug(`[${workerId}] Scraping page ${i}...`);

    let response: JOB_DETAILS[];
    try {
      response = (await GetAllJobs({
        url,
        headers,
        request,
      })) as JOB_DETAILS[];
    } catch (fetchError: any) {
      log.debug("snapShotting the jobs before throwing error");

      if (unSortedJobs.length > 0) {
        await saveSnapShots(unSortedJobs).catch((err) => {
          log.error(
            `[${workerId}] Error while saving snapshot before throwing error: ${err.message}`,
          );
        });
      }

      throw new RateLimitError(
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
      log.success(
        `[${workerId}] Reached end of fresh jobs at page ${i}. Stopping Scrapping and returning Data.`,
      );
      let consolidatingSnapshotJobs = await getAllSnapshotJobs("./snapShots");
      unSortedJobs.push(...consolidatingSnapshotJobs);
      return unSortedJobs;
    }

    console.log(unSortedJobs.length);

    unSortedJobs.push(...response);
  }

  return unSortedJobs;
}
