import type { ConfirmChannel, Message } from "amqplib";
import type { JOB_DETAILS } from "../../index.js";
import {
  Logger,
  RateLimitingError,
  TransferingWorkToNextQueue,
  GetDesiredJobs as makeHttpRequestToGetAllDesiredJobs,
} from "../../index.js";
import { CreatingEnvironmentToScrap } from "../CreatingEnvironmentToScrap.js";

export default async function HttpBasedScrap(
  workerId: string,
  channel: ConfirmChannel,
  message: Message,
  composedURL: string,
  platform: string = "naukri",
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let lastPageCrashed = null;
  let customMaxRetries = { times: 10 };
  let orderedJobs;

  let {
    totalJobsAvailable: initialTotalJobs,
    url,
    headers,
    request,
    jobDetails,
  } = await CreatingEnvironmentToScrap(composedURL, workerId);

  while (attempt < customMaxRetries.times) {
    try {
      orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        totalJobsAvailable: initialTotalJobs,
        retryStartingPage: lastPageCrashed,
        workerId,
        initialbatchOfJobs: jobDetails,
        platform,
      });

      await TransferingWorkToNextQueue(
        channel,
        orderedJobs,
        message,
        workerId,
        platform,
      );
      return;
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message ?? String(error);
      if (error instanceof RateLimitingError) {
        lastPageCrashed = error.lastPage;
        Logger.warn(error.message);
      } else {
        Logger.warn(`[${workerId}] Scrape error occurred: ${errorMessage}`);
      }
      attempt++;
    }
  }

  throw new Error(
    `[${workerId}] Max scrape retries (${customMaxRetries.times}) exhausted without completing scrape.`,
  );
}

const httpScrapping = HttpBasedScrap;
export { HttpBasedScrap, httpScrapping };
