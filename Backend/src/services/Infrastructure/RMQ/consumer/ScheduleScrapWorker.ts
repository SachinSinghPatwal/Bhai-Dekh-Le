import amqp, { type Message } from "amqplib";
import { ScheduleScrape } from "../../../../constants.js";
import Scraper from "../../../Scrapper.js";

let connection: any = null;
let channel: any = null;

export async function ScrapingWorker(id: number) {
  const workerId = process.env.WORKER_ID ?? `worker-${id}`;

  console.log(`[${workerId}] Connecting to RabbitMQ...`);

  connection = await amqp.connect(
    process.env.RABBITMQ_URL ?? "amqp://admin:admin123@localhost:5672",
  );

  channel = await connection.createChannel();

  await channel.assertExchange(ScheduleScrape, "direct", {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(ScheduleScrape, {
    durable: true,
  });

  await channel.bindQueue(ScheduleScrape, ScheduleScrape, "Scrapper");

  console.log(`[${workerId}] Waiting for messages...`);

  await channel.consume(ScheduleScrape, async (message: Message | null) => {
    if (!message) return;

    console.log(`[${workerId}] Received: ${message.content.toString()}`);

    const scraper = await Scraper.getInstance(workerId);

    try {
      const jobs = await scraper.scrape();

      console.log(`[${workerId}] Jobs: ${jobs?.length ?? 0}`);

      channel.ack(message);
    } catch (error) {
      console.error(`[${workerId}] Scraping failed:`, error);

      channel.nack(message, false, true);
    }
  });

  console.log(`[${workerId}] Consumer is listening`);
}

export async function shutdownWorker() {
  console.log(`[${process.env.WORKER_ID}] Closing RabbitMQ...`);

  try {
    await channel?.close();
    await connection?.close();
  } catch (error) {
    console.error("RabbitMQ shutdown error:", error);
  }

  channel = null;
  connection = null;
}
