import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import log from "../../../utility/Logger.js";
import saveSnapShots from "../../../helper/SaveSnapShots.js";
import GetAllJobs from "../utility/Fetch.js";
import { RateLimitError } from "../utility/playwright/RateLimitingError.js";
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
    setIterativePaginationParams(url as URL, i);

    const response = (await GetAllJobs({
      url,
      headers,
      request,
    })) as JOB_DETAILS[];

    if (response instanceof RateLimitError || response instanceof Error) {
      log.debug("snapShotting the jobs before throwing error");

      await saveSnapShots(unSortedJobs).catch((err) => {
        throw new Error(
          `[${workerId}] Error while saving snapshot before throwing error: ${err.message}`,
        );
      });

      throw new RateLimitError(
        `Error from [${workerId}] last page was [[${i}]] total pages completed ${i - initialPage} | Reason stopped: ${response.message}`,
        i,
      );
    } else if (response[1].footerPlaceholderLabel) {
      return unSortedJobs;
    } else if (!Array.isArray(response) || response.length == 0) {
      throw new Error(
        `[${workerId}] cannot iterate over the jobs , Jobs are not iteratable`,
      );
    } else {
      unSortedJobs.push(...response);
    }
  }
}
