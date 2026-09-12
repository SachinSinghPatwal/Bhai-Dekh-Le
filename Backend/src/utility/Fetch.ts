import { RequestParams } from "../services/ComposeHttpRequest.js";

export default async function Fetch({ url, request, headers }: RequestParams):Promise<any> {
  const response = await fetch(url, {
    method: request.method(),
    headers,
  });
  const body = await response.json();  
  return body.jobDetails;
}
