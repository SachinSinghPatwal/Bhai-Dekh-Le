import {
  JOB_DETAILS,
  RequestParams,
  Logger,
  bodyValidation,
  responseValidation,
} from "../index.js";

export default async function Fetch({
  url,
  request,
  headers,
}: Partial<RequestParams>): Promise<JOB_DETAILS[]> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url!, {
        method: request,
        headers,
      });

      await responseValidation(response);

      const body = await response.json();
      return bodyValidation(body);
    } catch (error) {
      // Fast-fail immediately on hard recaptcha block so parent can renew the flagged session
      if ((error as Error)?.message === "RECAPTCHA_BLOCK") {
        throw error;
      }

      attempt++;

      if (attempt >= MAX_RETRIES) {
        throw error;
      }

      const baseDelay = 5000;
      const jitter = Math.floor(Math.random() * 3000);
      const delayMs = baseDelay * Math.pow(2, attempt - 1) + jitter;

      Logger.debug(
        `[Fetch] Attempt ${attempt} failed (${(error as Error).message}). Retrying in ${(delayMs / 1000).toFixed(1)}s...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Fetch failed after maximum retries");
}

const GetAllJobs = Fetch;
export { GetAllJobs };
