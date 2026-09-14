import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import GetAllJobs from "../utility/Fetch.js";
import ValidateJobIsPostedWithinThreeDays from "../utility/ValidatingProp.js";
import { setIterativePaginationParams } from "./Playwright/setIterativePagiantionParams.js";

interface SCRAPPING_PAGINATED_JOBS extends Required<RequestParams> {
  unSortedJobs: JOB_DETAILS[];
  maxPages: number;
  initialScrap: boolean;
  pageNumber?: number;
  jobsPerPage?: number;
}

interface JOB_RELATED_DETAILS {
  jobDetails: SCRAPPING_PAGINATED_JOBS["unSortedJobs"];
  noOfJobs?: number;
}

export default async function ScrappingPaginatedJob({
  url,
  headers,
  request,
  unSortedJobs,
  maxPages,
  initialScrap,
  pageNumber = 1,
  jobsPerPage = 20,
}: SCRAPPING_PAGINATED_JOBS): Promise<number | undefined> {
  const { jobDetails, noOfJobs } = (await GetAllJobs({
    url,
    headers,
    request,
  })) as JOB_RELATED_DETAILS;

  if (initialScrap && noOfJobs) {
    maxPages = Math.ceil(noOfJobs / jobsPerPage);
  } else {
    setIterativePaginationParams(url, pageNumber);
  }

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
    );
  } else {
    throw new Error("jobDetails are not iterable");
  }

  if (initialScrap) {
    return maxPages;
  }
}
