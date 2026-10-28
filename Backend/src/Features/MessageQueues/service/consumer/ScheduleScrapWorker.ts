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
import amqp, { type Message, type ConfirmChannel } from "amqplib";
import {
  dbSave,
  dbSaveExchange,
  ScheduleScrape,
} from "../../../../constants.js";
import Logger from "../../../../utility/Logger.js";
import PlatformInitialization from "../../../Scrapping/services/PlatformInitialization.js";

const log = Logger; 

const workerId = process.env.WORKER_ID ?? "worker-unknown";

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: ConfirmChannel | null = null;
let shuttingDown = false;

async function start(): Promise<void> {
  connection = await amqp.connect(process.env.RABBITMQ_URL_WITH_CREDENTIALS!);
  channel = await connection.createConfirmChannel();

  await channel.prefetch(1);

  await channel.assertExchange(ScheduleScrape, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(ScheduleScrape, {
    durable: true,
  });

  await channel.bindQueue(ScheduleScrape, ScheduleScrape, "Scrapper");

  await channel.assertExchange(dbSaveExchange, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(dbSave, {
    durable: true,
  });

  await channel.bindQueue(dbSave, dbSaveExchange, "Save");

  await channel.consume(ScheduleScrape, async (message: Message | null) => {
    if (!message || shuttingDown) {
      return;
    }

    try {
      log.debug(`[${workerId}] PID=${process.pid} PPID=${process.ppid}`);

      let content: {
        platform?: string;
        totalNumberOfJobs?: number;
      };
      try {
        content = JSON.parse(message.content.toString());
      } catch (parseErr) {
        log.error(
          `[${workerId}] Discarding message: ${message.content.toString()}`,
        );
        channel?.ack(message);
        return;
      }

      const { platform } = content;
      if (!platform) {
        log.error(
          `[${workerId}] Discarding message with missing platform`,
        );
        channel?.ack(message);
        return;
      }

      log.info(`[${workerId}] Received scrape task for platform: ${platform}`);

      if (!channel) {
        throw new Error("RabbitMQ channel is not initialized");
      }

      let isSettled = false;
      const safeChannel = new Proxy(channel, {
        get(target, prop, receiver) {
          if (prop === "ack") {
            return (msg: Message, allUpTo?: boolean) => {
              if (isSettled) return;
              isSettled = true;
              return target.ack(msg, allUpTo);
            };
          }
          if (prop === "nack") {
            return (msg: Message, allUpTo?: boolean, requeue?: boolean) => {
              if (isSettled) return;
              isSettled = true;
              return target.nack(msg, allUpTo, requeue);
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as ConfirmChannel;

      await PlatformInitialization(
        workerId,
        platform,
        safeChannel,
        message,
      );
    } catch (error) {
      log.error(
        `[${workerId}] Scraping or DB-queue publishing failed: ${(error as Error).message}`,
      );

      if (!shuttingDown && channel) {
        try {
          channel.nack(message, false, true);
        } catch {}
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
