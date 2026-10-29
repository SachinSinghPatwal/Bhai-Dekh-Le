import amqp from "amqplib";
import { Logger, ScheduleScrape } from "../../index.js";

const log = Logger;

export default async function ScheduleJdScrape(): Promise<void> {
  const platform = "naukri-jd";
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL_WITH_CREDENTIALS!,
  );

  try {
    log.info("[ScheduleJdScrape] Enqueuing JD scraping task to RabbitMQ...");

    const channel = await connection.createConfirmChannel();

    await channel.assertExchange(ScheduleScrape, "direct", {
      durable: true,
      autoDelete: false,
    });

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

    await channel.waitForConfirms();

    log.success("[ScheduleJdScrape] JD scraping task published to queue and confirmed.");

    await channel.close();
  } finally {
    await connection.close();
  }
}
