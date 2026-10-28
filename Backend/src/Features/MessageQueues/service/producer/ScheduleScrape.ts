import amqp from "amqplib";
import { Logger, ScheduleScrape, SCRAPING_PLATFORMS } from "../../index.js";

const log = Logger;

export default async function ScheduleScrapeJob(
  platformsToScrape: string[] = SCRAPING_PLATFORMS,
): Promise<void> {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL_WITH_CREDENTIALS!,
  );

  try {
    log.success("Producer connected to RabbitMQ");

    const channel = await connection.createConfirmChannel();

    await channel.assertExchange(ScheduleScrape, "direct", {
      durable: true,
      autoDelete: false,
    });

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
        },
      );
    }

    await channel.waitForConfirms();

    log.success(`${platformsToScrape.length} platform scrape messages published and confirmed`);

    await channel.close();
  } finally {
    await connection.close();

    log.info("Producer connection closed");
  }
}
