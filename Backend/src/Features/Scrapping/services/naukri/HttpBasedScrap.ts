import { ConfirmChannel, Message } from "amqplib";
import { JOB_DETAILS, log } from "../../index.js";
import { RateLimitError } from "../../utility/playwright/RateLimitingError.js";
import {
  CreatingEnviromentToScrap,
  SETUP_RETURNED_VALUES,
} from "../CreatingEnviromentToScrap.js";
import makeHttpRequestToGetAllDesiredJobs from "../GetDesiredJobs.js";
import { dbSaveExchange } from "../../../../constants.js";

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

  while (attempt < customMaxRetries.times) {
    try {
      /*
       * Final Check on the Total pages from consumer to self
       */
      const { url, request, headers, totalJobsAvaibles, jobDetails } =
        (await CreatingEnviromentToScrap()) as Required<SETUP_RETURNED_VALUES>;

      if (initialTotalJobs === 0) {
        initialTotalJobs = Math.max(totalJobsAvaibles, totalNumberOfJobs);
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
        totalJobsAvaibles: initialTotalJobs,
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
        channel!.ack(message);

        log.info(`[${workerId}] No jobs found. Task acknowledged.`);

        return;
      }
      /*
       * =========================
       * 3. PUBLISH TO DB QUEUE
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
       * 4. WAIT FOR BROKER CONFIRM
       * =========================
       *
       * Do NOT ACK the original scrape task
       * before this.
       */

      await channel.waitForConfirms();

      /*
       * =========================
       * 5. ACK SCRAPE TASK
       * =========================
       */

      channel!.ack(message);

      log.success(
        `[${workerId}] Scrape result successfully handed to DB queue.`,
      );
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        lastPageCrashed = error.lastPage;
        log.warn(error.message);
      }

      attempt++;
    }
  }
}
