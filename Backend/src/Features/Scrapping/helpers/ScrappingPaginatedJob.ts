import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import log from "../../../utility/Logger.js";
import saveSnapShots from "../../../helper/SaveSnapShots.js";
import GetAllJobs from "../utility/Fetch.js";
import { RateLimitError } from "../utility/playwright/RateLimitingError.js";
import { setIterativePaginationParams } from "./setIterativePaginationParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Partial<RequestParams> {
  unSortedJobs: JOB_DETAILS[];
  currentPageNumber: number;
  workerId: string;
  endPage: number;
  initialPage: number;
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  unSortedJobs,
  currentPageNumber,
  workerId,
  initialPage,
}: SCRAPPING_PAGINATED_JOBS): Promise<any> {
  setIterativePaginationParams(url as URL, currentPageNumber);

  const response = await GetAllJobs({
    url,
    headers,
    request,
  });

  if (response instanceof RateLimitError || response instanceof Error) {
    log.debug("snapShotting the jobs before throwing error");

    await saveSnapShots(unSortedJobs).catch((err) => {
      throw new Error(
        `[${workerId}] Error while saving snapshot before throwing error: ${err.message}`,
      );
    });

    throw new RateLimitError(
      `Rate limited by Application [${workerId}] last page was [[${currentPageNumber}]] total pages completed ${currentPageNumber - initialPage} and retrying on last page | Reason: ${response.message}`,
      currentPageNumber,
    );
  } else {
    if (Array.isArray(response) && response.length > 0) {
      unSortedJobs.push(...response);
    } else {
      throw new Error(
        `[${workerId}] cannot iterate over the jobs , Jobs are not iteratable`,
      );
    }
  }
}
