import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import GetAllJobs from "../utility/Fetch.js";
import { RateLimitError } from "../utility/RateLimitingError.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";
import { setIterativePaginationParams } from "./Playwright/setIterativePaginationParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Partial<RequestParams> {
  unSortedJobs: JOB_DETAILS[];
  pageNumber?: number;
  workerId: string;
  endPage: number;
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  unSortedJobs,
  pageNumber,
  workerId,
}: SCRAPPING_PAGINATED_JOBS): Promise<any> {
  setIterativePaginationParams(url as URL, pageNumber);

  const jobDetails = await GetAllJobs({
    url,
    headers,
    request,
  });

  if (Array.isArray(jobDetails) && jobDetails.length > 0) {
    unSortedJobs.push(...jobDetails);
    console.log(
      "Worker :",
      workerId,
      "Page :",
      pageNumber,
    );
  } else {
    throw new RateLimitError(
      `xxxxxxxxx Rate limited by Application ${workerId} last page was ${pageNumber} totla pages complted ${sortingUnsortedJobBasedOnTimeCreated(unSortedJobs).length} xxxxxxxxx `,
      pageNumber as number,
    );
  }
}
