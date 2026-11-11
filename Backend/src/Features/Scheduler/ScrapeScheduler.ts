import cron, { type ScheduledTask } from "node-cron";
import { ScrapeScheduleModel } from "../../models/Mongo/schedule.models.js";
import { SCRAPE_INTERVAL_MINUTES } from "../../constants.js";
import ScheduleScrapeJob from "../MessageQueues/service/producer/ScheduleScrape.js";
import log from "../../utility/Logger.js";

export function formatScheduleDateTime(date: Date): string {
  const hours24 = date.getHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours = String(hours24 % 12 || 12).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${hours}:${minutes} ${period} ${day}-${month}-${year}`;
}

let activeCronTask: ScheduledTask | null = null;
let activeTicker: NodeJS.Timeout | null = null;

export async function executeScheduledScrape(
  triggeredBy: string,
): Promise<void> {
  const now = new Date();
  const lockDurationMs = 5 * 60 * 1000;
  const lockExpiration = new Date(now.getTime() + lockDurationMs);
  const replicaId = `worker-pid-${process.pid}-${Date.now()}`;
  const nextTarget = new Date(
    now.getTime() + SCRAPE_INTERVAL_MINUTES * 60 * 1000,
  );

  const lockedDoc = await ScrapeScheduleModel.findOneAndUpdate(
    {
      key: "default_scrape_schedule",
      $or: [
        { lockUntil: { $lte: now } },
        { lockUntil: { $exists: false } },
        { lockUntil: null },
      ],
    },
    {
      $set: {
        lockUntil: lockExpiration,
        lockedBy: replicaId,
        isRunning: true,
        isConfigured: true,
        intervalMinutes: SCRAPE_INTERVAL_MINUTES,
        lastScheduledAt: now,
        nextScrapeAt: nextTarget,
      },
    },
    { returnDocument: "after", upsert: true },
  );

  if (!lockedDoc) {
    log.info(
      `Scrape cron triggered by ${triggeredBy} skipped: execution in progress or locked by replica`,
    );
    return;
  }

  const nextIso = lockedDoc.nextScrapeAt.toISOString();
  const nextFormatted = formatScheduleDateTime(lockedDoc.nextScrapeAt);
  log.info(
    `Scrape schedule initiated by ${triggeredBy} [Lock ID: ${replicaId}], next at ${nextIso} (${nextFormatted})`,
  );

  try {
    await ScheduleScrapeJob();

    await ScrapeScheduleModel.updateOne(
      { key: "default_scrape_schedule" },
      {
        $set: {
          isRunning: false,
          lockUntil: new Date(0),
        },
      },
    );

    log.success(`Scrape schedule dispatch finished successfully`);
  } catch (error) {
    log.error(`Scrape schedule dispatch failed:`, error);
    await ScrapeScheduleModel.updateOne(
      { key: "default_scrape_schedule" },
      {
        $set: {
          isRunning: false,
          lockUntil: new Date(0),
        },
      },
    );
  }
}

export async function checkAndTriggerSchedule(): Promise<void> {
  const doc = await ScrapeScheduleModel.findOne({
    key: "default_scrape_schedule",
  });
  if (!doc) {
    return;
  }

  const now = new Date();
  if (now >= doc.nextScrapeAt) {
    await executeScheduledScrape("cron-schedule-watcher");
  }
}

export async function triggerManualScrape(): Promise<void> {
  await executeScheduledScrape("user-manual-trigger");
}

function restartSchedulerWatchers(): void {
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }
  if (activeTicker) {
    clearInterval(activeTicker);
    activeTicker = null;
  }

  activeCronTask = cron.schedule("* * * * *", () => {
    void checkAndTriggerSchedule();
  });

  activeTicker = setInterval(() => {
    void checkAndTriggerSchedule();
  }, 5000);
}

export async function initScrapeScheduler(): Promise<void> {
  const existing = await ScrapeScheduleModel.findOne({
    key: "default_scrape_schedule",
  });

  const now = new Date();
  const intervalMs = SCRAPE_INTERVAL_MINUTES * 60 * 1000;
  const maxNextScrape = new Date(now.getTime() + intervalMs);

  let nextScrape = maxNextScrape;
  let shouldReconcile = false;

  if (existing) {
    if (existing.nextScrapeAt <= now) {
      shouldReconcile = true;
      nextScrape = maxNextScrape;
    } else if (existing.nextScrapeAt <= maxNextScrape) {
      nextScrape = existing.nextScrapeAt;
    }
  }

  await ScrapeScheduleModel.findOneAndUpdate(
    { key: "default_scrape_schedule" },
    {
      $set: {
        intervalMinutes: SCRAPE_INTERVAL_MINUTES,
        nextScrapeAt: nextScrape,
        isConfigured: true,
        lockUntil: new Date(0),
        isRunning: false,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  restartSchedulerWatchers();

  const nextFormatted = formatScheduleDateTime(nextScrape);
  log.info(
    `Scrape cron scheduler initialized: every ${SCRAPE_INTERVAL_MINUTES}m, next at ${nextFormatted}`,
  );

  if (shouldReconcile) {
    log.info(`Reconciling missed scrape schedule from previous session...`);
    void executeScheduledScrape("startup-reconcile");
  }
}

export function stopScrapeScheduler(): void {
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }
  if (activeTicker) {
    clearInterval(activeTicker);
    activeTicker = null;
  }
}
