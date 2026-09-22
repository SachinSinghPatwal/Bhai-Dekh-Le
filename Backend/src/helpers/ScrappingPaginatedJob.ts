import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import GetAllJobs from "../Features/Playwright/utility/Fetch.js";
import { RateLimitError } from "../Features/Playwright/utility/RateLimitingError.js";
import { setIterativePaginationParams } from "./Playwright/setIterativePaginationParams.js";

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

  try {
    const jobDetails = await GetAllJobs({
      url,
      headers,
      request,
    });

    if (Array.isArray(jobDetails) && jobDetails.length > 0) {
      unSortedJobs.push(...jobDetails);
    } else {
      throw new Error("Empty jobDetails returned (caught by else block)");
    }
  } catch (error: any) {
    throw new RateLimitError(
      `Rate limited by Application ${workerId} last page was ${pageNumber} total pages complted ${pageNumber - startPage} | Reason: ${error.message}`,
      pageNumber,
    );
  }
}
