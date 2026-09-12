import { type Request } from "playwright";
import { setIterativePaginationParams } from "../helpers/Playwright/setIterativePagiantionParams.js";
import GetAllJobs from "../utility/Fetch.js";
import ValidateJobIsPostedWithinThreeDays from "../utility/ValidatingProp.js";

export interface RequestParams {
  url: URL;
  request: Request;
  headers: Record<string, string>;
}

export default async function composeHttpRequest({
  url,
  request,
  headers,
}: RequestParams) {
  let data: Record<string, number>[] = [];

  try {
    for (let i = 1; i < 2; i++) {
      setIterativePaginationParams(url, i);
      const allJobs = await GetAllJobs({ url, headers, request });
      const filteredRecentJob = allJobs.filter(
        (each: Record<string, unknown>) =>
          ValidateJobIsPostedWithinThreeDays(each),
      );
      data.push(...filteredRecentJob);
    }
    console.log("data from ComposeHTTPRequest:", data);
    return data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return error;
    }
  }
}
