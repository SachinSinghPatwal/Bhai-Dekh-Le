import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import GetAllJobs from "../utility/Fetch.js";
import { RateLimitError } from "../utility/RateLimitingError.js";
import ValidateJobIsPostedWithinThreeDays from "../utility/ValidatingProp.js";
import { setIterativePaginationParams } from "./Playwright/setIterativePagiantionParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Partial<RequestParams> {
  unSortedJobs: JOB_DETAILS[];
  pageNumber?: number;
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  unSortedJobs,
  pageNumber,
}: SCRAPPING_PAGINATED_JOBS): Promise<any> {
  const jobDetails = await GetAllJobs({
    url,
    headers,
    request,
  });

  setIterativePaginationParams(url as URL, pageNumber);

  if (Array.isArray(jobDetails) && jobDetails.length > 0) {
    unSortedJobs.push(...jobDetails);
    console.log(
      "desired jobs",
      unSortedJobs
        .filter((job) => {
          const title = String(job.title ?? "").toLowerCase();
          return title.includes("react") || title.includes("javascript");
        })
        .map((job) => ValidateJobIsPostedWithinThreeDays(job))
        .filter(Boolean)
        .map((each) => ({
          title: each?.title,
          createdAt: each?.footerPlaceholderLabel,
        })),
      "--page number",
      pageNumber,
      "desired job",
      unSortedJobs.length
    );
  } else {
    throw new RateLimitError("Rate limited by Application", pageNumber as number);
  }
}
