import { RequestParams } from "../types.js";

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
  if (response.headers.get("content-type")?.includes("text/html")) {
    const text = await response.text();
    console.log("BODY START:", text.slice(0, 500));
  }
  const body = await response.json();
  const { jobDetails, noOfJobs } = body;
  return { jobDetails, noOfJobs };
}
