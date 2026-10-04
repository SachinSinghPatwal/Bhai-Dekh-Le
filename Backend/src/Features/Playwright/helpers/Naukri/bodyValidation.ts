import { JOB_DETAILS } from "../../../../models/Mongo/job.models.js";
import log from "../../../../utility/Logger.js";

export default function bodyValidation(body: Record<string, any>): JOB_DETAILS {
  // Fast fail on Recaptcha so we don't waste time retrying
  const { jobDetails } = body;
  if (body.statusCode === 406 || body.message === "recaptcha required") {
    log.warn("[Fetch] Recaptcha block, Fast failing...");
    throw new Error("RECAPTCHA_BLOCK"); // Special message we can catch
  }
  if (!jobDetails || (Array.isArray(jobDetails) && jobDetails.length === 0)) {
    log.warn(
      `[Fetch] Empty jobDetails for Full body: ${JSON.stringify(body).slice(0, 500)}`,
    );
    throw new Error("Empty jobDetails returned, possible soft block.");
  }

  return jobDetails;
}
