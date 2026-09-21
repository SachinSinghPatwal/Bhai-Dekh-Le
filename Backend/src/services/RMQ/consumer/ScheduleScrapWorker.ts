import "../../../config/load-env.js";

import amqp, { type Message } from "amqplib";

import { dbSave, dbSaveExchange, ScheduleScrape } from "../../../constants.js";

import Scrapper from "../../Scrapper.js";
import type { JOB_DETAILS } from "../../../models/Mongo/job.models.js";

const workerId = process.env.WORKER_ID ?? "worker-unknown";

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;

let channel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>["createConfirmChannel"]>
> | null = null;

let shuttingDown = false;

async function start(): Promise<void> {
  /*
   * =========================
   * RABBITMQ
   * =========================
   */

  connection = await amqp.connect(process.env.RABBITMQ_URL_WITH_CREDENTIALS!);

  channel = await connection.createConfirmChannel();

  /*
   * One scraping task at a time
   * for this worker.
   */
  await channel.prefetch(1);

  /*
   * =========================
   * SCRAPE QUEUE
   * =========================
   */

  await channel.assertExchange(ScheduleScrape, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(ScheduleScrape, {
    durable: true,
  });

  await channel.bindQueue(ScheduleScrape, ScheduleScrape, "Scrapper");

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

  await channel.consume(ScheduleScrape, async (message: Message | null) => {
    if (!message || shuttingDown) {
      return;
    }

    console.log(
      `[${workerId}] Received scrape task:`,
      message.content.toString(),
    );

    try {
      console.log(`[${workerId}] PID=${process.pid} PPID=${process.ppid}`);

      /*
       * =========================
       * 1. SCRAPE
       * =========================
       */

      const scrapedJobs = (await Scrapper(workerId)) as JOB_DETAILS[];

      /*
       * =========================
       * 2. NOTHING FOUND
       * =========================
       */

      if (!Array.isArray(scrapedJobs) || scrapedJobs.length === 0) {
        channel!.ack(message);

        console.log(`[${workerId}] No jobs found. Task acknowledged.`);

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
            jobs: scrapedJobs,
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

      await channel!.waitForConfirms();

      /*
       * =========================
       * 5. ACK SCRAPE TASK
       * =========================
       */

      channel!.ack(message);

      console.log(
        `[${workerId}] Scrape result successfully handed to DB queue.`,
      );
    } catch (error) {
      console.error(
        `[${workerId}] Scraping or DB-queue publishing failed:`,
        error,
      );

      /*
       * The original scrape task is returned
       * to RabbitMQ.
       */
      if (!shuttingDown) {
        channel!.nack(message, false, true);
      }
    }
  });

  /*
   * Worker is now completely initialized.
   */
  if (process.send) {
    process.send({
      type: "ready",
    });
  }

  console.log(`[${workerId}] Scraper worker ready.`);
}

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`[${workerId}] Shutting down...`);

  try {
    await channel?.close();

    await connection?.close();
  } catch (error) {
    console.error(`[${workerId}] RabbitMQ shutdown error:`, error);
  }

  channel = null;
  connection = null;

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
  console.error(`[${workerId}] Fatal startup error:`, error);

  process.exit(1);
});
