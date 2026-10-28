import {
  JOB_DETAILS,
  RequestParams,
  Logger,
  SaveSnapShots,
  Fetch,
  RateLimitingError,
  getAllSnapShots,
  breather,
} from "../index.js";
import checkIsJobStale from "./naukri/checkIsJobStale.js";
import { setIterativePaginationParams } from "./setIterativePaginationParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Partial<RequestParams> {
  workerId: string;
  endPage: number;
  initialPage: number;
  initialJobs: JOB_DETAILS[] | any[];
  platform?: string;
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  workerId,
  initialPage,
  initialJobs,
  endPage,
  platform,
}: SCRAPPING_PAGINATED_JOBS): Promise<any> {
  let unSortedJobs = [];

  /*
    Intial request interception provide body and no of total jobs exist
    */
  if (Array.isArray(initialJobs) && initialJobs.length > 0) {
    unSortedJobs.push(...initialJobs);
  }

  for (let i = initialPage; i < endPage; i++) {

    await breather(i, initialPage, workerId);
    
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
        await SaveSnapShots(unSortedJobs, platform).catch((err) => {
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

    const isOlderThanLimit = checkIsJobStale(response);

    if (isOlderThanLimit) {
      Logger.success(
        `[${workerId}] Reached end of fresh jobs at page ${i}. Stopping Scrapping and returning Data.`,
      );
      let consolidatingSnapshotJobs = await getAllSnapShots(platform);
      unSortedJobs.push(...consolidatingSnapshotJobs);
      return unSortedJobs;
    }

    unSortedJobs.push(...response);

  }

  return unSortedJobs;
}
