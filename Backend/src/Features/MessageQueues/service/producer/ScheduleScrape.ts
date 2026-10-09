import amqp from "amqplib";
import log from "../../../../utility/Logger.js";
import { ScheduleScrape } from "../../../../constants.js";

export default async function ScheduleScrapping(): Promise<void> {
  const platform = "naukri";
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

    const workerCount = Number(process.env.SCRAP_WORKER_COUNT ?? 4);

    for (let i = 0; i < workerCount; i++) {
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

    log.success(`${workerCount} messages published and confirmed`);

    await channel.close();
  } finally {
    await connection.close();

    log.info("Producer connection closed");
  }
}
