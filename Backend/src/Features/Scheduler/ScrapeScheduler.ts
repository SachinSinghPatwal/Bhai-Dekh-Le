import cron, { type ScheduledTask } from "node-cron";
import type { Response } from "express";
import {
  ScrapeScheduleModel,
  type ScrapeIntervalMinutes,
} from "../../models/Mongo/schedule.models.js";
import ScheduleScrapeJob from "../MessageQueues/service/producer/ScheduleScrape.js";
import log from "../../utility/Logger.js";

export const VALID_INTERVALS: readonly ScrapeIntervalMinutes[] = [
  10, 15, 20, 30, 45, 60,
] as const;

export function isValidInterval(val: number): val is ScrapeIntervalMinutes {
  return VALID_INTERVALS.includes(val as ScrapeIntervalMinutes);
}

export function formatScheduleDateTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}-${month}-${year}`;
}

export interface ScheduleStatusPayload extends Record<string, unknown> {
  intervalMinutes: ScrapeIntervalMinutes;
  nextScrapeAt: string;
  nextScrapeFormatted: string;
  lastScheduledAt: string | null;
  lastStartedAt: string | null;
  isRunning: boolean;
  isConfigured: boolean;
  serverTime: string;
}

let activeCronTask: ScheduledTask | null = null;
let activeTicker: NodeJS.Timeout | null = null;
let currentInterval: ScrapeIntervalMinutes = 20;
const sseClients = new Set<Response>();

export function registerSseClient(res: Response): () => void {
  sseClients.add(res);

  void getSchedulePayload().then((payload) => {
    if (payload && !res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  });

  return () => {
    sseClients.delete(res);
  };
}

export function broadcastSchedule(payload: ScheduleStatusPayload): void {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    if (!client.writableEnded) {
      client.write(message);
    } else {
      sseClients.delete(client);
    }
  }
}

export async function getSchedulePayload(): Promise<ScheduleStatusPayload> {
  const doc = await ScrapeScheduleModel.findOne({
    key: "default_scrape_schedule",
  }).lean();

  const now = new Date();
  const interval = (doc?.intervalMinutes ?? currentInterval) as ScrapeIntervalMinutes;
  const nextAt = doc?.nextScrapeAt
    ? new Date(doc.nextScrapeAt)
    : new Date(now.getTime() + interval * 60 * 1000);

  return {
    intervalMinutes: interval,
    nextScrapeAt: nextAt.toISOString(),
    nextScrapeFormatted: formatScheduleDateTime(nextAt),
    lastScheduledAt: doc?.lastScheduledAt
      ? new Date(doc.lastScheduledAt).toISOString()
      : null,
    lastStartedAt: doc?.lastStartedAt
      ? new Date(doc.lastStartedAt).toISOString()
      : null,
    isRunning: Boolean(doc?.isRunning),
    isConfigured: Boolean(doc?.isConfigured),
    serverTime: now.toISOString(),
  };
}

export async function executeScheduledScrape(
  triggeredBy: string,
): Promise<void> {
  const now = new Date();
  const lockDurationMs = 5 * 60 * 1000;
  const lockExpiration = new Date(now.getTime() + lockDurationMs);
  const replicaId = `worker-pid-${process.pid}-${Date.now()}`;

  const currentDoc = await ScrapeScheduleModel.findOne({
    key: "default_scrape_schedule",
  });
  const interval = (currentDoc?.intervalMinutes ?? currentInterval) as ScrapeIntervalMinutes;
  currentInterval = interval;

  const nextTarget = new Date(now.getTime() + interval * 60 * 1000);

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
        lastScheduledAt: now,
        nextScrapeAt: nextTarget,
      },
    },
    { returnDocument: "after" },
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
    broadcastSchedule({
      intervalMinutes: currentInterval,
      nextScrapeAt: nextIso,
      nextScrapeFormatted: nextFormatted,
      lastScheduledAt: now.toISOString(),
      lastStartedAt: lockedDoc.lastStartedAt
        ? new Date(lockedDoc.lastStartedAt).toISOString()
        : null,
      isRunning: true,
      isConfigured: true,
      serverTime: new Date().toISOString(),
    });

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
  } finally {
    const updated = await getSchedulePayload();
    broadcastSchedule(updated);
  }
}

export async function checkAndTriggerSchedule(): Promise<void> {
  const doc = await ScrapeScheduleModel.findOne({
    key: "default_scrape_schedule",
  });
  if (!doc || !doc.isConfigured) {
    return;
  }

  const now = new Date();
  if (now >= doc.nextScrapeAt) {
    await executeScheduledScrape("cron-schedule-watcher");
  }
}

export async function triggerManualScrape(): Promise<ScheduleStatusPayload> {
  await executeScheduledScrape("user-manual-trigger");
  return getSchedulePayload();
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

export async function setScrapeSchedule(
  intervalMinutes: ScrapeIntervalMinutes,
): Promise<ScheduleStatusPayload> {
  if (!isValidInterval(intervalMinutes)) {
    throw new Error(
      `Invalid interval: ${intervalMinutes}. Must be 10, 15, 20, 30, 45, or 60.`,
    );
  }

  currentInterval = intervalMinutes;
  const now = new Date();
  const nextScrape = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  const doc = await ScrapeScheduleModel.findOneAndUpdate(
    { key: "default_scrape_schedule" },
    {
      $set: {
        intervalMinutes,
        nextScrapeAt: nextScrape,
        isConfigured: true,
        lockUntil: new Date(0),
        isRunning: false,
      },
    },
    { returnDocument: "after", upsert: true },
  );

  restartSchedulerWatchers();

  log.success(
    `Scrape schedule updated to every ${intervalMinutes} minutes, next at ${formatScheduleDateTime(doc.nextScrapeAt)}`,
  );

  void executeScheduledScrape("schedule-interval-updated");

  return getSchedulePayload();
}

export async function initScrapeScheduler(): Promise<void> {
  const existing = await ScrapeScheduleModel.findOne({
    key: "default_scrape_schedule",
  });

  const now = new Date();

  let targetInterval: ScrapeIntervalMinutes = 20;
  let nextScrape = new Date(now.getTime() + 20 * 60 * 1000);
  let shouldReconcile = false;
  let isConfigured = false;

  if (existing) {
    targetInterval = existing.intervalMinutes;
    isConfigured = Boolean(existing.isConfigured);
    if (isConfigured && existing.nextScrapeAt <= now) {
      shouldReconcile = true;
      nextScrape = new Date(now.getTime() + targetInterval * 60 * 1000);
    } else {
      nextScrape = existing.nextScrapeAt;
    }
  }

  currentInterval = targetInterval;

  await ScrapeScheduleModel.findOneAndUpdate(
    { key: "default_scrape_schedule" },
    {
      $set: {
        intervalMinutes: targetInterval,
        nextScrapeAt: nextScrape,
        isConfigured,
        lockUntil: new Date(0),
        isRunning: false,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  restartSchedulerWatchers();

  const nextFormatted = formatScheduleDateTime(nextScrape);
  log.info(
    `Scrape cron scheduler initialized: every ${targetInterval}m, next at ${nextFormatted} (Configured: ${isConfigured})`,
  );

  if (shouldReconcile && isConfigured) {
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
