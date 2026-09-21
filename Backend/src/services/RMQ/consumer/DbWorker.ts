import "../../../config/load-env.js";

import amqp, { type Message } from "amqplib";
import mongoose from "mongoose";
import { JobModel } from "../../../models/Mongo/job.models.js";
import { dbSave, dbSaveExchange } from "../../../constants.js";

import connectToMongoDb from "../../../utility/workers/connectToDb.js";
import log from "../../../utility/Logger.js";

let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;

let channel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>["createChannel"]>
> | null = null;

let shuttingDown = false;

async function start(): Promise<void> {
  /*
   * =========================
   * MONGODB
   * =========================
   */
  // from utiltiy as the exit 1 code is handled by the lifecycle
  await connectToMongoDb();

  log.success(`[DB Worker ${process.pid}] MongoDB connected`);

  /*
   * =========================
   * RABBITMQ
   * =========================
   */

  rabbitConnection = await amqp.connect(
    process.env.RABBITMQ_URL_WITH_CREDENTIALS!,
  );

  channel = await rabbitConnection.createChannel();

  /*
   * One DB-save message at a time
   * for this worker.
   */
  await channel.prefetch(1);

  /*
   * =========================
   * DB SAVE QUEUE
   * =========================
   */

  await channel.assertExchange(dbSaveExchange, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(dbSave, {
    durable: true,
  });

  await channel.bindQueue(dbSave, dbSaveExchange, "Save");

  /*
   * =========================
   * CONSUMER
   * =========================
   */

  await channel.consume(dbSave, async (message: Message | null) => {
    if (!message || shuttingDown) {
      return;
    }

    try {
      const payload = JSON.parse(message.content.toString());

      const jobs = payload.jobs;

      if (!Array.isArray(jobs) || jobs.length === 0) {
        channel!.ack(message);

        log.info(`[DB Worker ${process.pid}] Empty job batch. ACK.`);

        return;
      }

      log.info(`[DB Worker ${process.pid}] Saving ${jobs.length} jobs`);

      /*
       * =========================
       * MONGODB BULK WRITE
       * =========================
       */

      await JobModel.bulkWrite(
        jobs.map((job) => ({
          updateOne: {
            filter: {
              jobId: job.jobId,
            },

            update: {
              $set: job,
            },

            upsert: true,
          },
        })),
      );

      /*
       * bulkWrite() resolving means the
       * operation completed successfully.
       *
       * Do not check result.acknowledged here
       * because the Mongoose BulkWriteResult type
       * does not expose that property in your setup.
       */

      channel!.ack(message);

      log.success(`[DB Worker ${process.pid}] Saved ${jobs.length} jobs.`);
    } catch (error) {
      log.error(`[DB Worker ${process.pid}] DB write failed: ${error}`);

      /*
       * Put the message back into RabbitMQ.
       *
       * NOTE:
       * This is simple retry behavior. If MongoDB
       * remains unavailable, this can retry rapidly.
       * Later we should add retry/DLQ backoff.
       */
      if (!shuttingDown) {
        channel!.nack(message, false, true);
      }
    }
  });

  log.success(`[DB Worker ${process.pid}] Ready.`);

  /*
   * Tell WorkerManager that this worker is
   * completely initialized.
   */
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

  log.info(`[DB Worker ${process.pid}] Shutting down...`);

  try {
    /*
     * Closing the channel stops the consumer.
     *
     * Any unacknowledged RabbitMQ message will be
     * returned to RabbitMQ when the channel/connection
     * disappears.
     */
    await channel?.close();

    await rabbitConnection?.close();

    /*
     * This MongoDB connection belongs to THIS
     * forked DB worker process.
     */
    await mongoose.connection.close();
  } catch (error) {
    log.error(`[DB Worker ${process.pid}] Shutdown error: ${error}`);
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
  log.error(`[DB Worker ${process.pid}] Fatal startup error: ${error}`);

  process.exit(1);
});
