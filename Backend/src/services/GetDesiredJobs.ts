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
  try {
    unSortedJobs = await GetAllJobs({
      url,
      headers,
      request,
    });
    while (pageNumber <= 2) {
      setIterativePaginationParams(url, pageNumber);

      const filteredRecentJob = unSortedJobs.map(
        (each: Record<string, unknown>) =>
          ValidateJobIsPostedWithinThreeDays(each),
      );

      // console.log("Filtered Recent jobs ",filteredRecentJob)
      if (filteredRecentJob) {
        // SortedJobs.push(...(filteredRecentJob as Record<string, unknown>[]));
      }
      pageNumber++;
    }
    return SortedJobs;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return error;
    }
  }
}
