import { type Request } from "playwright";
import GetAllJobs from "../utility/Fetch.js";
import { setIterativePaginationParams } from "../helpers/Playwright/setIterativePagiantionParams.js";
import ValidateJobIsPostedWithinThreeDays from "../utility/ValidatingProp.js";

export interface RequestParams {
  url: URL;
  request: Request;
  headers: Record<string, string>;
}

export default async function getDesiredJobs({
  url,
  request,
  headers,
}: RequestParams) {
  let unSortedJobs: Record<string, number>[] = [];
  let SortedJobs: Record<string, unknown>[] = [];
  let pageNumber = 1;
  const jobsPerPage = 20;
  try {
    const { jobDetails, noOfJobs }: any = await GetAllJobs({
      url,
      headers,
      request,
    });
    unSortedJobs = jobDetails;
    while (pageNumber <= 40) {
      setIterativePaginationParams(url, pageNumber);
      const { jobDetails,_}: any = await GetAllJobs({
        url,
        headers,
        request,
      });
      unSortedJobs.push(jobDetails);
      pageNumber++;
    }
    const filteredRecentJob = unSortedJobs.map(
      (each: Record<string, unknown>) => {
        if (
          (each.title as string).toLocaleLowerCase().includes("react") ||
          ((each.title as string).toLocaleLowerCase().includes("javascript") &&
            Number(
              (each.footerPlaceholderLabel as string)
                .split(" ")[0]
                .replace("+", ""),
            ) <= 3)
        ) {
          return ValidateJobIsPostedWithinThreeDays(each);
        } else {
          return;
        }
      },
    );
    if (filteredRecentJob) {
      console.log("desiredjob :", filteredRecentJob.length);
      // SortedJobs.push(...(filteredRecentJob as Record<string, unknown>[]));
    }
    console.log("total page number : ", pageNumber, "total jobs", noOfJobs);

    return SortedJobs;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return error;
    }
  }
}
