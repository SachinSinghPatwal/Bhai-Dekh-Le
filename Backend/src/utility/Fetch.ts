import { RequestParams } from "../services/GetDesiredJobs.js";

interface FetchParams extends Partial<RequestParams> {
  method?: "GET";
}

export default async function Fetch({
  url,
  request,
  headers,
  method = "GET",
}: FetchParams): Promise<Record<string, number>[]> {
  const response = await fetch(url!, {
    method: request?.method() ?? method,
    headers,
  });
  const body = await response.json();
  return body.jobDetails ?? [];
}
