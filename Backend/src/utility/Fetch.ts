import { RequestParams } from "../services/GetDesiredJobs.js";

interface FetchParams extends Partial<RequestParams> {
  method?: "GET";
}

export default async function Fetch({
  url,
  request,
  headers,
  method = "GET",
}: FetchParams): Promise<object> {
  const response = await fetch(url!, {
    method: request?.method() ?? method,
    headers,
  });
  const body = await response.json();
  const { jobDetails, noOfJobs } = body;
  return { jobDetails, noOfJobs };
}
