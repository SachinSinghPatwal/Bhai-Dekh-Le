import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import log from "../../../utility/Logger.js";
import GetAllJobs from "../utility/Fetch.js";
import { RateLimitError } from "../utility/RateLimitingError.js";
import { setIterativePaginationParams } from "./setIterativePaginationParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Partial<RequestParams> {
  unSortedJobs: JOB_DETAILS[];
  pageNumber: number;
  workerId: string;
  endPage: number;
  startPage: number;
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  unSortedJobs,
  pageNumber,
  workerId,
  startPage,
}: SCRAPPING_PAGINATED_JOBS): Promise<any> {
  setIterativePaginationParams(url as URL, pageNumber);

  const response = await GetAllJobs({
    url,
    headers,
    request,
  });

  if (response instanceof RateLimitError || response instanceof Error) {
    throw new RateLimitError(
      `Rate limited by Application [${workerId}] last page was [[${pageNumber}]] total pages complted [[${pageNumber - startPage}]] | Reason: ${response.message}`,
      pageNumber,
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
