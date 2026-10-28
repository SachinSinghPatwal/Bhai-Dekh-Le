import type { ConfirmChannel, Message } from "amqplib";
import type { JOB_DETAILS } from "../../../../types.js";
import Logger from "../../../../utility/Logger.js";
import { RateLimitError as RateLimitingError } from "../../utility/playwright/RateLimitingError.js";
import TransferingWorkToNextQueue from "../../../MessageQueues/helpers/TransferingWorkToNextQueue.js";
import makeHttpRequestToGetAllDesiredJobs from "../GetDesiredJobs.js";
import { CreatingEnvironmentToScrap } from "../CreatingEnvironmentToScrap.js";
import {
  CustomBrailleDotBar,
  startSpinningLoader,
} from "../../../../utility/TerminalProgress.js";

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

  const sessionLoader = startSpinningLoader(
    `[${workerId}] Initializing ${platform} session & scraping environment...`,
  );

  let initialTotalJobs: number;
  let url: URL;
  let headers: Record<string, string>;
  let request: string;
  let jobDetails: JOB_DETAILS[];

  try {
    const env = await CreatingEnvironmentToScrap(composedURL, workerId);
    initialTotalJobs = env.totalJobsAvailable;
    url = env.url;
    headers = env.headers;
    request = env.request;
    jobDetails = env.jobDetails;
    sessionLoader.stop(
      `[${workerId}] ${platform} session ready (${initialTotalJobs} total jobs available).`,
    );
  } catch (envError: any) {
    sessionLoader.fail(
      `[${workerId}] ${platform} session initialization failed: ${envError?.message ?? envError}`,
    );
    throw envError;
  }

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
      if (error instanceof RateLimitingError) {
        lastPageCrashed = error.lastPage;
      }
      attempt++;
    }
  }

  const failureReason = `Max scrape retries (${customMaxRetries.times}) exhausted without completing scrape.`;
  CustomBrailleDotBar(
    lastPageCrashed ?? 1,
    60,
    `[${workerId}] ${platform}`,
    24,
    undefined,
    `${workerId}-${platform}`,
    true,
    failureReason,
  );

  throw new Error(`[${workerId}] ${failureReason}`);
}

const httpScrapping = HttpBasedScrap;
export { HttpBasedScrap, httpScrapping };
