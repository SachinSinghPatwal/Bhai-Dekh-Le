import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import log from "../../../utility/Logger.js";
import bodyValidation from "../helpers/naukri/bodyValidation.js";
import ResponseValidation from "./playwright/ResponseValidation.js";

export default async function Fetch({
  url,
  request,
  headers,
}: Partial<RequestParams>): Promise<JOB_DETAILS | undefined> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url!, {
        method: request,
        headers,
      });

      await ResponseValidation(response);

      const body = await response.json();

      const jobDetails = bodyValidation(body);

      return jobDetails;
    } catch (error: any) {
      // If it's a hard recaptcha block, don't bother retrying with the same flagged session
      log.debug(
        `[Fetch] Attempt ${attempt} failed. Retrying in ${(attempt % 3) * 2}s... (${error.message})`,
      );
      await new Promise((resolve) => setTimeout(resolve, (attempt % 3) * 2000));
      return error;
    }
  }
}
