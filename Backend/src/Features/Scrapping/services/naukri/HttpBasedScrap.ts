import { ConfirmChannel, Message } from "amqplib";
import {
  JOB_DETAILS,
  log,
  JOB_SEARCH_URL,
  dbSaveExchange,
} from "../../index.js";
import { RateLimitError } from "../../../Scrapping/utility/playwright/RateLimitingError.js";
import { CreatingEnvironmentToScrap } from "../CreatingEnvironmentToScrap.js";
import makeHttpRequestToGetAllDesiredJobs from "../../../Scrapping/services/GetDesiredJobs.js";

import ComposeUrl from "../../utility/ComposeUrl.js";
import saveSnapShots from "../../../../helper/SaveSnapShots.js";
import { cleanupStaleSnapshots } from "../../../../helper/cleanupStaleSnapshots.js";

export default async function httpScrapping(
  workerId: string,
  totalNumberOfJobs: number,
  channel: ConfirmChannel,
  message: Message,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let lastPageCrashed = null;
  let customMaxRetries = { times: 10, changed: false };
  let orderedJobs;
  let initialTotalJobs = 0;

  const composedURL = ComposeUrl(JOB_SEARCH_URL.path, JOB_SEARCH_URL.query);

  const { totalJobsAvailable, url, headers, request, jobDetails } =
    await CreatingEnvironmentToScrap(composedURL, workerId);

  while (attempt < customMaxRetries.times) {
    try {
      /**
       * @description Final Check on the Total pages from consumer to self
       */
      if (initialTotalJobs === 0) {
        initialTotalJobs = Math.max(totalJobsAvailable, totalNumberOfJobs);
      }

      if (!customMaxRetries.changed) {
        customMaxRetries.changed = true; //flag for updated end page

        customMaxRetries.times =
          initialTotalJobs / Number(process.env.SCRAP_WORKER_COUNT ?? 4);
      }

      orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        totalJobsAvailable: initialTotalJobs,
        retryStartingPage: lastPageCrashed,
        workerId,
        jobDetails,
      });
      /*
       * =========================
       * 2. NOTHING FOUND
       * =========================
       */

      if (!Array.isArray(orderedJobs) || orderedJobs.length === 0) {
        channel!.nack(message);

        log.info(`[${workerId}] No jobs found. Task acknowledged.`);

        return;
      }
      /*
       * =========================
       * 3. MONGO_URI NOT DEFINED:
       * STORE LOCALLY IN SNAPSHOTS
       * & DO NOT FORWARD TO DB QUEUE
       * =========================
       */
      if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
        log.warn(
          `[${workerId}] MONGO_URI is not defined. DB workers are suspended; saving ${orderedJobs.length} jobs to 'Backend/snapShots' and cleaning up stale snapshots.`,
        );

        await saveSnapShots(orderedJobs);
        await cleanupStaleSnapshots();

        channel!.ack(message);

        log.success(
          `[${workerId}] Scrape result persisted to local snapshots. Task acknowledged.`,
        );

        return;
      }

      /*
       * =========================
       * 4. PUBLISH TO DB QUEUE
       * =========================
       */

      channel!.publish(
        dbSaveExchange,
        "Save",
        Buffer.from(
          JSON.stringify({
            jobs: orderedJobs,
          }),
        ),
        {
          persistent: true,
        },
      );

      /*
       * =========================
       * 5. WAIT FOR BROKER CONFIRM
       * =========================
       *
       * Do NOT ACK the original scrape task
       * before this.
       */

      await channel.waitForConfirms();

      /*
       * =========================
       * 6. ACK SCRAPE TASK
       * =========================
       */

      channel!.ack(message);

      log.success(
        `[${workerId}] Scrape result successfully handed to DB queue.`,
      );

      return;
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        lastPageCrashed = error.lastPage;
        log.warn(error.message);
      }

      attempt++;
    }
  }

  throw new Error(
    `[${workerId}] Max scrape retries (${customMaxRetries.times}) exhausted without completing scrape.`,
  );
}
