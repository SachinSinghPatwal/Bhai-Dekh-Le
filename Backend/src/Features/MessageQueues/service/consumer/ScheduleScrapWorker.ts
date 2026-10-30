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
  dbSaveDlx,
  dbSaveDlq,
  dbSaveDlqRoutingKey,
  ScheduleScrape,
  scrapeDlx,
  scrapeDlq,
  scrapeDlqRoutingKey,
  QUEUE_MESSAGE_TTL_MS,
} from "../../../../constants.js";
import Logger from "../../../../utility/Logger.js";
import PlatformInitialization from "../../../Scrapping/services/PlatformInitialization.js";
import { safeAssertConfirmQueue } from "../../helpers/safeAssertQueue.js";

const log = Logger;

const workerId = process.env.WORKER_ID ?? "worker-unknown";

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: ConfirmChannel | null = null;
let shuttingDown = false;

async function start(): Promise<void> {
  connection = await amqp.connect(process.env.RABBITMQ_URL_WITH_CREDENTIALS!);
  channel = await connection.createConfirmChannel();

  await channel.prefetch(1);

  await channel.assertExchange(scrapeDlx, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(scrapeDlq, {
    durable: true,
  });

  await channel.bindQueue(scrapeDlq, scrapeDlx, scrapeDlqRoutingKey);

  await channel.assertExchange(ScheduleScrape, "direct", {
    durable: true,
    autoDelete: false,
  });

  const assertedScrape = await safeAssertConfirmQueue(
    connection,
    channel,
    ScheduleScrape,
    {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": scrapeDlx,
        "x-dead-letter-routing-key": scrapeDlqRoutingKey,
        "x-message-ttl": QUEUE_MESSAGE_TTL_MS,
      },
    },
  );
  channel = assertedScrape.channel;

  await channel.bindQueue(ScheduleScrape, ScheduleScrape, "Scrapper");

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
    connection,
    channel,
    dbSave,
    {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": dbSaveDlx,
        "x-dead-letter-routing-key": dbSaveDlqRoutingKey,
        "x-message-ttl": QUEUE_MESSAGE_TTL_MS,
      },
    },
  );
  channel = assertedDb.channel;

  await channel.bindQueue(dbSave, dbSaveExchange, "Save");

  await channel.consume(ScheduleScrape, async (message: Message | null) => {
    if (!message || shuttingDown) {
      return;
    }

    let isSettled = false;
    const safeChannel = new Proxy(channel!, {
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

    let platform = "unknown";

    try {
      log.debug(`[${workerId}] PID=${process.pid} PPID=${process.ppid}`);

      let content: {
        platform?: string;
        totalNumberOfJobs?: number;
      };
      try {
        content = JSON.parse(message.content.toString());
      } catch (_parseErr:unknown) {
        log.error(
          `[${workerId}] Discarding message: ${message.content.toString()} Reason ${(_parseErr as Error).message}`,
        );
        safeChannel.ack(message);
        return;
      }

      if (!content.platform) {
        log.error(
          `[${workerId}] Discarding message with missing platform`,
        );
        safeChannel.ack(message);
        return;
      }

      platform = content.platform;
      log.info(`[${workerId}] Received scrape task for platform: ${platform}`);

      await PlatformInitialization(
        workerId,
        platform,
        safeChannel,
        message,
      );
    } catch (error) {
      log.error(
        `[${workerId}] Scraping execution error: ${(error as Error).message}`,
      );

      if (isSettled) {
        return;
      }

      const retryCount = Number(message.properties.headers?.["x-retry-count"] || 0) + 1;
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        log.error(
          `[${workerId}] Scraping task for ${platform} permanently failed after ${maxRetries} attempts. Routing to DLQ (${scrapeDlq}).`,
        );
        safeChannel.nack(message, false, false);
      } else {
        const backoffMs = retryCount * 3000;
        log.warn(
          `[${workerId}] Scraping task for ${platform} failed (Attempt ${retryCount}/${maxRetries}). Retrying in ${backoffMs / 1000}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        if (!shuttingDown && channel) {
          channel.publish(
            ScheduleScrape,
            "Scrapper",
            message.content,
            {
              persistent: true,
              expiration: String(QUEUE_MESSAGE_TTL_MS),
              headers: {
                ...message.properties.headers,
                "x-retry-count": retryCount,
              },
            },
          );
          safeChannel.ack(message);
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
