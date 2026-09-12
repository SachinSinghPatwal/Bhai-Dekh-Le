import { type Request } from "playwright";
import GetAllJobs from "../utility/Fetch.js";

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
