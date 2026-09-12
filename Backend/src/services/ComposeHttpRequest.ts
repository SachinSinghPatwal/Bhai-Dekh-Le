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
    data = await GetAllJobs({
      url,
      headers,
      request,
    });
    return data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return error;
    }
  }
}
