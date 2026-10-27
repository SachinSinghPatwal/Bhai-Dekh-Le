import type { ConfirmChannel, Message } from "amqplib";
import type { JOB_DETAILS } from "../../index.js";
import {
  Logger,
  RateLimitingError,
  JOB_FOUND_SEARCH_URL,
  TransferingWorkToNextQueue,
  GetDesiredJobs as makeHttpRequestToGetAllDesiredJobs,
  ComposeUrl,
  JOB_FOUND_BASE_URL,
  intialFetch,
} from "../../index.js";

export default async function HttpBasedScrap(
  workerId: string,
  channel: ConfirmChannel,
  message: Message,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let lastPageCrashed = null;
  let customMaxRetries = { times: 10 };
  let orderedJobs;

  const composedURL = ComposeUrl(
    JOB_FOUND_SEARCH_URL.path,
    JOB_FOUND_BASE_URL,
    JOB_FOUND_SEARCH_URL.query,
  );

  const { totalPages, jobs } = await intialFetch(composedURL, workerId);

  while (attempt < customMaxRetries.times) {
    try {
      orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url: new URL(composedURL),
        totalJobsAvailable: totalPages,
        retryStartingPage: lastPageCrashed,
        workerId,
        initialbatchOfJobs: jobs,
        platform: "jobFound",
      });

      await TransferingWorkToNextQueue(
        channel,
        orderedJobs,
        message,
        workerId,
        "jobFound",
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
