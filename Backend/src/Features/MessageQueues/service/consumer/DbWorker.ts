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

import amqp from "amqplib";
import mongoose from "mongoose";
import {
  type Message,
  JobModel,
  dbSave,
  dbSaveExchange,
  connectToDb,
  Logger,
  naukriJDScrap,
} from "../../index.js";

const log = Logger;
const connectToMongoDb = connectToDb;

let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>["createChannel"]>
> | null = null;
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

  channel = await rabbitConnection.createChannel();
  await channel.prefetch(1);

  await channel.assertExchange(dbSaveExchange, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(dbSave, {
    durable: true,
  });

  await channel.bindQueue(dbSave, dbSaveExchange, "Save");

  await channel.consume(dbSave, async (message: Message | null) => {
    if (!message || shuttingDown) {
      return;
    }

    let jobs: any[] = [];

    try {
      const payload = JSON.parse(message.content.toString());
      jobs = payload.jobs;

      if (!Array.isArray(jobs) || jobs.length === 0) {
        channel!.ack(message);
        log.info(`[DB Worker] Empty job batch. ACK.`);
        return;
      }

      log.info(`[DB Worker] Saving ${jobs.length} jobs`);

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

        channel!.ack(message);
        log.success(
          `[DB Worker] Saved ${response.insertedCount} new jobs in MongoDB (received: ${jobs.length}).`,
        );

        try {
          await naukriJDScrap(jobs, process.env.WORKER_ID ?? "db-worker");
        } catch (jdErr: any) {
          log.error(
            `[DB Worker] naukriJDScrap execution error: ${jdErr?.message ?? jdErr}`,
          );
        }

        return;
      }
      throw new Error("Something went wrong while inserting in the db");
    } catch (error: any) {
      const writeErrors = error?.writeErrors;
      const hasOnlyDuplicateErrors =
        Array.isArray(writeErrors) &&
        writeErrors.length > 0 &&
        writeErrors.every((we: any) => we.code === 11000);

      const isDuplicateKey =
        hasOnlyDuplicateErrors ||
        error?.code === 11000 ||
        (String(error?.message || "").includes("E11000 duplicate key") &&
          (!Array.isArray(writeErrors) ||
            writeErrors.every((we: any) => we.code === 11000)));

      if (isDuplicateKey) {
        const insertedCount = error?.result?.insertedCount ?? 0;
        log.debug(
          `[DB Worker] Duplicate job key (${error?.message || "E11000"}). Existing jobs skipped (inserted ${insertedCount} new). ACK.`,
        );
        channel!.ack(message);

        try {
          await naukriJDScrap(jobs, process.env.WORKER_ID ?? "db-worker");
        } catch (jdErr: any) {
          log.error(
            `[DB Worker] naukriJDScrap execution error: ${jdErr?.message ?? jdErr}`,
          );
        }
        return;
      }

      log.error(`[DB Worker] DB write failed: ${error}`);

      if (!shuttingDown) {
        channel!.nack(message, false, true);
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
