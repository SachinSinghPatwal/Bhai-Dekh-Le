import amqp, { Message } from "amqplib";
import { ScheduleScrape } from "../../../../constants.js";
import Scraper from "../../../Scrapper.js";

export async function ScrapingWorker (id: number) {
  console.log("CONNECTING WITH ADMIN USER");
  const connection = await amqp.connect(
    "https://rabbitmq-4-management-x53s.onrender.com/",
  );

  const channel = await connection.createChannel();

  await channel.assertExchange(ScheduleScrape, "direct", { durable: true });

  // declare three queue
  await channel.assertQueue("info_logs");

  // Bind each queue with matching routing keys
  await channel.bindQueue("info_logs", ScheduleScrape, "info");

  console.log("waiting for direct log messages ...");

  const workerId = process.env.WORKER_ID!;

  // consumer for each queue
  await channel.consume(ScheduleScrape, async (Theme) => {
    console.log(`[INFO] ${Theme?.toString()}`);

    const scraper = await Scraper.getInstance(workerId);

    try {
      const jobs = await scraper.scrape();

      console.log(`Worker ${id} jobs:`, jobs);
    } catch (error) {
      console.error(error);
    } finally {
      await scraper.close();
    }
    channel.ack(Theme as Message);
  });
};
