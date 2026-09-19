import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";

interface FetchParams extends Partial<RequestParams> {
  method?: "GET";
}

export default async function Fetch({
  url,
  request,
  headers,
  method = "GET",
}: FetchParams): Promise<JOB_DETAILS> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url!, {
        method: request?.method() ?? method,
        headers,
      });

      if (response.status === 429) {
        throw new Error("Rate Limited - 429 Too Many Requests");
      }

      if (response.headers.get("content-type")?.includes("text/html")) {
        const text = await response.text();
        console.log("BODY START:", text.slice(0, 500));
        throw new Error(
          "Received HTML instead of JSON. Possible Rate Limit or Block.",
        );
      }

      const body = await response.json();

      // Fast fail on Recaptcha so we don't waste time retrying
      if (body.statusCode === 406 || body.message === "recaptcha required") {
        console.log(`[Fetch] Recaptcha block, Fast failing...`);
        throw new Error("RECAPTCHA_BLOCK"); // Special message we can catch
      }

      const { jobDetails } = body;

      if (
        !jobDetails ||
        (Array.isArray(jobDetails) && jobDetails.length === 0)
      ) {
        console.log(
          `[Fetch] Empty jobDetails for Full body:`,
          JSON.stringify(body).slice(0, 500),
        );
        throw new Error("Empty jobDetails returned, possible soft block.");
      }

      return jobDetails;
    } catch (error: any) {
      // If it's a hard recaptcha block, don't bother retrying with the same flagged session
      if (error.message === "RECAPTCHA_BLOCK") {
        throw error;
      }

      attempt++;
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      console.log(
        `[Fetch] Attempt ${attempt} failed. Retrying in ${(attempt % 3) * 5}s... (${error.message})`,
      );
      await new Promise((resolve) => setTimeout(resolve, (attempt % 3) * 5000));
    }
  }

  return [] as any; // Fallback
}
