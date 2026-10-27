import {
  type ConfirmChannel,
  type Message,
  type JOB_DETAILS,
  Logger,
  dbSaveExchange,
  SaveSnapShots,
  cleanupStaleSnapshots,
} from "../index.js";

export default async function TransferingWorkToNextQueue(
  channel: ConfirmChannel,
  orderedJobs: JOB_DETAILS[],
  message: Message,
  workerId: string,
  platform: string = "naukri",
) {
  if (!Array.isArray(orderedJobs) || orderedJobs.length === 0) {
    channel!.nack(message);

    Logger.info(`[${workerId}] No jobs found. Task acknowledged.`);

    return;
  }
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
    Logger.warn(
      `[${workerId}] MONGO_URI is not defined. DB workers are suspended; saving ${orderedJobs.length} jobs to 'Backend/snapShots/${platform}' and cleaning up stale snapshots.`,
    );

    await SaveSnapShots(orderedJobs, platform);
    await cleanupStaleSnapshots(platform);

    channel!.ack(message);

    Logger.success(
      `[${workerId}] Scrape result persisted to local snapshots (${platform}). Task acknowledged.`,
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
  Logger.success(`[${workerId}] Scrape result successfully handed to DB queue.`);
}

const sendToAnotherQueue = TransferingWorkToNextQueue;
export { sendToAnotherQueue };
