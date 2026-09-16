import { removeAllListeners } from "node:cluster";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import GetAllJobs from "../utility/Fetch.js";
import { RateLimitError } from "../utility/RateLimitingError.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";
import { setIterativePaginationParams } from "./Playwright/setIterativePagiantionParams.js";

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
  endPage, //logging
}: SCRAPPING_PAGINATED_JOBS): Promise<any> {
  
  setIterativePaginationParams(url as URL, pageNumber);

  const jobDetails = await GetAllJobs({
    url,
    headers,
    request,
  });

  if (Array.isArray(jobDetails) && jobDetails.length > 0) {
    unSortedJobs.push(...jobDetails);
    // Verbose logging removed per user request
    console.log(
      "--current Page number--",
      pageNumber,
      "--end page--",
      endPage,
      "remaining pages",
      endPage - pageNumber!,
      "desired jobs",
      sortingUnsortedJobBasedOnTimeCreated(unSortedJobs).length, //logging
      "--worker_Id--",
      workerId,
      "--url--",
      url,
    );
  } else {
    throw new RateLimitError(
      "Rate limited by Application",
      pageNumber as number,
    );
  }
}
