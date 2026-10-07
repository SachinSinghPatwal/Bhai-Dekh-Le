import "../../../../config/load-env.js";
import amqp, { type Message, type ConfirmChannel } from "amqplib";
import {
  dbSave,
  dbSaveExchange,
  ScheduleScrape,
} from "../../../../constants.js";
import log from "../../../../utility/Logger.js";
import PlateformInitialisation from "../../../Scrapping/services/PlateformInitialisation.js";

const workerId = process.env.WORKER_ID ?? "worker-unknown";

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;

let channel: ConfirmChannel | null = null;

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

  await channel.bindQueue(
    ScheduleScrape,
    ScheduleScrape,
    "Scrapper",
  );

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

    try {
      log.debug(`[${workerId}] PID=${process.pid} PPID=${process.ppid}`);
      /*
       * =========================
       * 1. SCRAPE
       * =========================
       */
      let content: { platform?: string; type?: "DOM" | "HTTP"; totalNumberOfJobs?: number };
      try {
        content = JSON.parse(message.content.toString());
      } catch (parseErr) {
        log.error(
          `[${workerId}] Discarding unparseable message: ${message.content.toString()}`,
        );
        channel?.ack(message);
        return;
      }

      const { platform, type } = content;
      if (!platform || !type) {
        log.error(
          `[${workerId}] Discarding message with missing platform or type`,
        );
        channel?.ack(message);
        return;
      }

      let totalNumberOfJobs =
        content.type === "HTTP" ? Number(content.totalNumberOfJobs ?? 0) : 0;

      if (!channel) {
        throw new Error("RabbitMQ channel is not initialized");
      }

      await PlateformInitialisation(
        workerId,
        totalNumberOfJobs,
        platform,
        type,
        channel,
        message,
      );
    } catch (error) {
      log.error(
        `[${workerId}] Scraping or DB-queue publishing failed: ${error}`,
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
}

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  log.info(`[${workerId}] Shutting down...`);

  try {
    await channel?.close();

    await connection?.close();
  } catch (error) {
    log.error(`[${workerId}] RabbitMQ shutdown error: ${error}`);
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
  log.error(`[${workerId}] Fatal startup error: ${error}`);

  process.exit(1);
});
