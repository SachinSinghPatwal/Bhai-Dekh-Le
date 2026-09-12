import { setIterativePaginationParams } from "../helpers/Playwright/setIterativePagiantionParams.js";
import { RequestParams } from "../services/ComposeHttpRequest.js";
import ValidateJobIsPostedWithinThreeDays from "./ValidatingProp.js";
export default async function Fetch({
  url,
  request,
  headers,
}: RequestParams): Promise<Record<string, number>[]> {
  const response = await fetch(url, {
    method: request.method(),
    headers,
  });
  const body = await response.json();
  const { jobDetails: unSortedJobs, noOfJobs: totalJobs } = body;

  let data: Record<string, number>[] = [];

  for (let i = 1; i < totalJobs; i++) {
    setIterativePaginationParams(url, i);

    const filteredRecentJob = unSortedJobs.filter(
      (each: Record<string, unknown>) =>
        ValidateJobIsPostedWithinThreeDays(each),
    );

    data.push(...filteredRecentJob);
  }
  return data;
}
