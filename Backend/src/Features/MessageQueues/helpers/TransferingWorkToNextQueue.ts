import { ConfirmChannel, Message } from "amqplib";
import { JOB_DETAILS, log, dbSaveExchange } from "../../Scrapping/index.js";
import saveSnapShots from "../../../helper/SaveSnapShots.js";
import cleanupStaleSnapshots from "../../../helper/cleanupStaleSnapshots.js";

export default async function sendToAnotherQueue(
  channel: ConfirmChannel,
  orderedJobs: JOB_DETAILS[],
  message: Message,
  workerId: string,
) {
  if (!Array.isArray(orderedJobs) || orderedJobs.length === 0) {
    channel!.nack(message);

    log.info(`[${workerId}] No jobs found. Task acknowledged.`);

    return;
  }
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
  await channel.waitForConfirms();
  channel!.ack(message);
  log.success(`[${workerId}] Scrape result successfully handed to DB queue.`);
}
