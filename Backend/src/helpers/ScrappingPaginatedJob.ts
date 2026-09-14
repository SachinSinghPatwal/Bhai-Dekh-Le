import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import GetAllJobs from "../utility/Fetch.js";
import ValidateJobIsPostedWithinThreeDays from "../utility/ValidatingProp.js";
import { setIterativePaginationParams } from "./Playwright/setIterativePagiantionParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Partial<RequestParams> {
  unSortedJobs: JOB_DETAILS[];
  pageNumber?: number;
  jobsPerPage?: number;
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  unSortedJobs,
  pageNumber = 1,
}: SCRAPPING_PAGINATED_JOBS): Promise<void> {

  const jobDetails = await GetAllJobs({
    url,
    headers,
    request,
  });

  setIterativePaginationParams(url as URL, pageNumber);

  if (Array.isArray(jobDetails) && jobDetails.length > 0) {
    unSortedJobs.push(...jobDetails);
    // console.log(
    //   "desired jobs",
    //   unSortedJobs
    //     .filter((job) => {
    //       const title = String(job.title ?? "").toLowerCase();
    //       return title.includes("react") || title.includes("javascript");
    //     })
    //     .map((job) => ValidateJobIsPostedWithinThreeDays(job))
    //     .filter(Boolean)
    //     .map((each) => ({
    //       title: each?.title,
    //       createdAt: each?.footerPlaceholderLabel,
    //     })),
    // );
  } else {
    throw new Error("jobDetails are not iterable");
  }
}
