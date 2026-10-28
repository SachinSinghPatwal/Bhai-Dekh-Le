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
import { CustomBrailleDotBar, startCustomBrailleBar } from "../../../utility/TerminalProgress.js";
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

  if (Array.isArray(initialJobs) && initialJobs.length > 0) {
    unSortedJobs.push(...initialJobs);
  }

  const actualTotalPages = Math.max(endPage - initialPage + 1, 1);
  const sessionKey = `${workerId}-${platform || "site"}`;
  const scrapBar = startCustomBrailleBar(
    0,
    actualTotalPages,
    `[${workerId}] ${platform || "site"}`,
    24,
    sessionKey,
  );

  for (let i = initialPage; i < endPage; i++) {
    await breather(i, initialPage, workerId);
    
    setIterativePaginationParams(url as URL, i);
    
    const pageIndex = i - initialPage + 1;
    scrapBar.update(pageIndex, actualTotalPages);

    let response: JOB_DETAILS[];

    try {
      response = (await Fetch({
        url,
        headers,
        request,
      })) as JOB_DETAILS[];
    } catch (fetchError: any) {
      scrapBar.fail(fetchError?.message ?? "Scraping failed");
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
      scrapBar.fail("Jobs are not iterable");
      throw new Error(
        `[${workerId}] cannot iterate over the jobs , Jobs are not iteratable`,
      );
    }

    const isOlderThanLimit = checkIsJobStale(response);

    if (isOlderThanLimit) {
      scrapBar.stop();
      let consolidatingSnapshotJobs = await getAllSnapShots(platform);
      unSortedJobs.push(...consolidatingSnapshotJobs);
      return unSortedJobs;
    }

    unSortedJobs.push(...response);
  }

  scrapBar.stop();
  return unSortedJobs;
}
