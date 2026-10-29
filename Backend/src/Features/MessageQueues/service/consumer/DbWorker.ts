const parentPid = process.ppid;
if (parentPid) {
  setInterval(() => {
    try {
      process.kill(parentPid, 0);
    } catch {
      process.exit(0);
    }
  }, 2000);
}
import "../../../../config/load-env.js";

import amqp, { type ConfirmChannel } from "amqplib";
import mongoose from "mongoose";
import {
  type Message,
  JobModel,
  dbSave,
  dbSaveExchange,
  dbSaveDlx,
  dbSaveDlq,
  dbSaveDlqRoutingKey,
  connectToDb,
  Logger,
  naukriJDScrap,
} from "../../index.js";
import { safeAssertConfirmQueue } from "../../helpers/safeAssertQueue.js";

const log = Logger;
const connectToMongoDb = connectToDb;

let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: ConfirmChannel | null = null;
let shuttingDown = false;

async function start(): Promise<void> {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
    log.warn("[DB Worker] MONGO_URI is not defined. DbWorker is suspended.");
    if (process.send) {
      process.send({ status: "ready" });
    }
    return;
  }

  await connectToMongoDb();

  rabbitConnection = await amqp.connect(
    process.env.RABBITMQ_URL_WITH_CREDENTIALS!,
  );

  channel = await rabbitConnection.createConfirmChannel();
  await channel.prefetch(1);

  await channel.assertExchange(dbSaveDlx, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(dbSaveDlq, {
    durable: true,
  });

  await channel.bindQueue(dbSaveDlq, dbSaveDlx, dbSaveDlqRoutingKey);

  await channel.assertExchange(dbSaveExchange, "direct", {
    durable: true,
    autoDelete: false,
  });

  const assertedDb = await safeAssertConfirmQueue(
    rabbitConnection,
    channel,
    dbSave,
    {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": dbSaveDlx,
        "x-dead-letter-routing-key": dbSaveDlqRoutingKey,
      },
    },
  );
  channel = assertedDb.channel;

  await channel.bindQueue(dbSave, dbSaveExchange, "Save");

  await channel.consume(dbSave, async (message: Message | null) => {
    if (!message || shuttingDown) {
      return;
    }

    let jobs: any[] = [];

    try {
      let payload: { jobs?: any[] };
      try {
        payload = JSON.parse(message.content.toString());
      } catch (_parseErr) {
        log.error(
          `[DB Worker] Discarding unparseable message: ${message.content.toString()}`,
        );
        channel!.ack(message);
        return;
      }

      jobs = payload.jobs ?? [];

      if (!Array.isArray(jobs) || jobs.length === 0) {
        channel!.ack(message);
        log.info(`[DB Worker] Empty job batch. ACK.`);
        return;
      }

      log.info(`[DB Worker] Saving ${jobs.length} jobs`);

      let bulkWriteSuccess = false;

      try {
        const response = await JobModel.bulkWrite(
          jobs.map((job) => ({
            insertOne: {
              document: job,
            },
          })),
          {
            ordered: false,
          },
        );

        if (response) {
          if (response.mongoose?.validationErrors?.length) {
            const errorDetails = response.mongoose.validationErrors
              .map((err: any) =>
                Object.values(err.errors || {})
                  .map((e: any) => e.message)
                  .join(", "),
              )
              .filter(Boolean)
              .join(" | ");

            throw new Error(
              `Document validation failed for ${response.mongoose.validationErrors.length} jobs: ${errorDetails}`,
            );
          }

          log.success(
            `[DB Worker] Saved ${response.insertedCount} new jobs in MongoDB (received: ${jobs.length}).`,
          );
          bulkWriteSuccess = true;
        }
      } catch (dbErr: any) {
        const writeErrors = dbErr?.writeErrors;
        const hasOnlyDuplicateErrors =
          Array.isArray(writeErrors) &&
          writeErrors.length > 0 &&
          writeErrors.every((we: any) => we.code === 11000);

        const isDuplicateKey =
          hasOnlyDuplicateErrors ||
          dbErr?.code === 11000 ||
          (String(dbErr?.message || "").includes("E11000 duplicate key") &&
            (!Array.isArray(writeErrors) ||
              writeErrors.every((we: any) => we.code === 11000)));

        if (isDuplicateKey) {
          const insertedCount = dbErr?.result?.insertedCount ?? 0;
          log.debug(
            `[DB Worker] Duplicate job key (${dbErr?.message || "E11000"}). Existing jobs skipped (inserted ${insertedCount} new).`,
          );
          bulkWriteSuccess = true;
        } else {
          throw dbErr;
        }
      }

      if (!bulkWriteSuccess) {
        throw new Error("Bulk write operation did not complete successfully");
      }

      await naukriJDScrap(jobs, process.env.WORKER_ID ?? "db-worker");

      channel!.ack(message);
      log.success(
        `[DB Worker] Batch processed and JDs queued successfully. ACK.`,
      );
    } catch (error: any) {
      log.error(`[DB Worker] Job batch processing failed: ${error?.message ?? error}`);

      if (shuttingDown || !channel) {
        return;
      }

      const retryCount = Number(message.properties.headers?.["x-retry-count"] || 0) + 1;
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        log.error(
          `[DB Worker] Job batch permanently failed after ${maxRetries} attempts. Routing to DLQ (${dbSaveDlq}). Error: ${error?.message ?? error}`,
        );
        channel.nack(message, false, false);
      } else {
        const backoffMs = retryCount * 3000;
        log.warn(
          `[DB Worker] Job batch failed (Attempt ${retryCount}/${maxRetries}). Retrying in ${backoffMs / 1000}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        if (!shuttingDown && channel) {
          channel.publish(
            dbSaveExchange,
            "Save",
            message.content,
            {
              persistent: true,
              headers: {
                ...message.properties.headers,
                "x-retry-count": retryCount,
              },
            },
          );
          await channel.waitForConfirms();
          channel.ack(message);
        }
      }
    }
  });

  if (process.send) {
    process.send({
      type: "ready",
    });
  }
}

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log.info(`[DB Worker] Shutting down...`);

  try {
    await channel?.close();
    await rabbitConnection?.close();
    await mongoose.connection.close();
  } catch (error) {
    log.error(`[DB Worker] Shutdown error: ${error}`);
  }

  channel = null;
  rabbitConnection = null;

  process.exit(0);
}

process.once("SIGTERM", () => {
  void shutdown();
});

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGUSR2", () => {
  void shutdown();
});

process.once("disconnect", () => {
  void shutdown();
});

start().catch((error) => {
  log.error(`[DB Worker] Fatal startup error: ${error}`);
  process.exit(1);
});
