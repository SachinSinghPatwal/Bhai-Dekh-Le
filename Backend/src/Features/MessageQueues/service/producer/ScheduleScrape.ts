import amqp from "amqplib";
import {
  Logger,
  ScheduleScrape,
  scrapeDlx,
  scrapeDlq,
  scrapeDlqRoutingKey,
  SCRAPING_PLATFORMS,
  QUEUE_MESSAGE_TTL_MS,
} from "../../index.js";
import { safeAssertConfirmQueue } from "../../helpers/safeAssertQueue.js";

const log = Logger;

export default async function ScheduleScrapeJob(
  platformsToScrape: string[] = SCRAPING_PLATFORMS,
): Promise<void> {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL_WITH_CREDENTIALS!,
  );

  try {
    log.success("Producer connected to RabbitMQ");

    let channel = await connection.createConfirmChannel();

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

    const asserted = await safeAssertConfirmQueue(
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
    channel = asserted.channel;

    await channel.bindQueue(ScheduleScrape, ScheduleScrape, "Scrapper");

    for (const platform of platformsToScrape) {
      channel.publish(
        ScheduleScrape,
        "Scrapper",
        Buffer.from(
          JSON.stringify({
            platform,
            totalNumberOfJobs: 0,
          }),
        ),
        {
          persistent: true,
          expiration: String(QUEUE_MESSAGE_TTL_MS),
        },
      );
    }

    await channel.waitForConfirms();

    log.success(
      `${platformsToScrape.length} platform scrape messages published and confirmed`,
    );

    await channel.close();
  } finally {
    await connection.close();

    log.info("Producer connection closed");
  }
}
