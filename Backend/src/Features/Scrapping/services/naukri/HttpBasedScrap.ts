import type { ConfirmChannel, Message } from "amqplib";
import type {
  JOB_DETAILS,
  NEW_ENVIRONMENT_DUE_TO_CRASH_PARAMS_TYPES,
  NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES,
} from "../../index.js";
import {
  log,
  RateLimitError,
  JOB_SEARCH_URL,
  sendToAnotherQueue,
  getDesiredJobs as makeHttpRequestToGetAllDesiredJobs,
  ComposeUrl,
} from "../../index.js";
import { CreatingEnvironmentToScrap } from "../CreatingEnvironmentToScrap.js";


export default async function httpScrapping(
  workerId: string,
  totalNumberOfJobs: number,
  channel: ConfirmChannel,
  message: Message,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let lastPageCrashed = null;
  let customMaxRetries = { times: 10 };
  let orderedJobs;
  let initialTotalJobs = 0;

  const composedURL = ComposeUrl(JOB_SEARCH_URL.path, JOB_SEARCH_URL.query);

  let { totalJobsAvailable, url, headers, request, jobDetails } =
    await CreatingEnvironmentToScrap(composedURL, workerId);

  while (attempt < customMaxRetries.times) {
    try {
      /**
       * @deprecating soon as logged user are always found nearly similar amount of jobs and recent jobs dont really relevant to total job length
       * @description Final Check on the Total pages from consumer to self
       */
      if (initialTotalJobs === 0) {
        initialTotalJobs = Math.max(totalJobsAvailable, totalNumberOfJobs);
      }

      orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        totalJobsAvailable: initialTotalJobs,
        retryStartingPage: lastPageCrashed,
        workerId,
        initialbatchOfJobs: jobDetails,
      });

      await sendToAnotherQueue(channel, orderedJobs, message, workerId);
      return;
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message ?? String(error);
      if (error instanceof RateLimitError) {
        lastPageCrashed = error.lastPage;
        log.warn(error.message);
      } else {
        log.warn(`[${workerId}] Scrape error occurred: ${errorMessage}`);
      }
      attempt++;
      const { newUrl, newHeaders, newRequest, newJobDetails } =
        (await creatingNewEnviromentToScrapForNextiterationDueToPrevCrash({
          attempt,
          customMaxRetries,
          workerId,
          composedURL,
          lastPageCrashed,
          errorMessage,
        })) as NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES;
      url = newUrl;
      headers = newHeaders;
      request = newRequest;
      jobDetails = newJobDetails;
    }
  }

  throw new Error(
    `[${workerId}] Max scrape retries (${customMaxRetries.times}) exhausted without completing scrape.`,
  );
}

async function creatingNewEnviromentToScrapForNextiterationDueToPrevCrash({
  attempt,
  customMaxRetries,
  workerId,
  composedURL,
  lastPageCrashed,
  errorMessage,
}: NEW_ENVIRONMENT_DUE_TO_CRASH_PARAMS_TYPES): Promise<
  NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES | string
> {
  const isRecaptcha = errorMessage.includes("RECAPTCHA_BLOCK");
  if (attempt < customMaxRetries.times) {
    const cooldownMs = isRecaptcha ? 20000 : 15000;
    log.warn(
      `[${workerId}] Scrape attempt ${attempt} failed. Cooling down for ${cooldownMs / 1000}s before retrying...`,
    );
    await new Promise((resolve) => setTimeout(resolve, cooldownMs));

    if (isRecaptcha) {
      log.info(
        `[${workerId}] Detected dead session (RECAPTCHA_BLOCK). Renewing stealth browser session...`,
      );
      try {
        const {
          url: newUrl,
          headers: newHeaders,
          request: newRequest,
          jobDetails: newJobDetails,
        } = await CreatingEnvironmentToScrap(composedURL, workerId);
        log.success(
          `[${workerId}] Fresh session tokens obtained. Resuming scrape from page ${lastPageCrashed ?? "initial"}.`,
        );
        return { newUrl, newHeaders, newRequest, newJobDetails };
      } catch (renewErr) {
        log.error(`[${workerId}] Failed to renew session tokens: ${renewErr}`);
      }
    }
  }
  return errorMessage;
}
