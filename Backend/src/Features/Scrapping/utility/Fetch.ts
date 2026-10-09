import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import log from "../../../utility/Logger.js";
import bodyValidation from "../helpers/naukri/bodyValidation.js";
import ResponseValidation from "./playwright/ResponseValidation.js";

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

      await ResponseValidation(response);

      const body = await response.json();
      return bodyValidation(body);
    } catch (error) {
      attempt++;

      if (attempt >= MAX_RETRIES) {
        throw error;
      }

      log.debug(`[Fetch] Attempt ${attempt} failed. Retrying...`);

      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }

  throw new Error("Fetch failed after maximum retries");
}
