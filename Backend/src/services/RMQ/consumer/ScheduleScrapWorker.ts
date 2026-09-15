import "../../../config/load-env.js";
import amqp, { type Message } from "amqplib";
import { ScheduleScrape } from "../../../constants.js";
import Scraper from "../../Scrapper.js";

const workerId = process.env.WORKER_ID ?? `worker-unknown`;

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>["createChannel"]>
> | null = null;

async function start() {
  console.log(`[${workerId}] Connecting to RabbitMQ...`);

  connection = await amqp.connect(
    process.env.RABBITMQ_URL ?? "amqp://admin:admin123@localhost:5672",
  );

  channel = await connection.createChannel();

  // Only process 1 message at a time per worker
  await channel.prefetch(1);

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

    try {
      const scraper = Scraper.getInstance(workerId);

      const jobs = await scraper.scrape();

      console.log(`[${workerId}] Jobs: ${jobs?.length ?? 0}`);

      channel!.ack(message);
    } catch (error) {
      console.error(`[${workerId}] Scraping failed:`, error);

      channel!.nack(message, false, true);
    }
  });

  console.log(`[${workerId}] Consumer is listening`);

  // Tell the parent (WorkerManager) we're ready to receive messages
  if (process.send) {
    process.send({ type: "ready" });
  }
}

async function shutdown() {
  console.log(`[${workerId}] Shutting down...`);

  try {
    await channel?.close();
    await connection?.close();
  } catch (error) {
    console.error(`[${workerId}] Shutdown error:`, error);
  }

  channel = null;
  connection = null;

  process.exit(0);
}

// Graceful shutdown on signals from parent (WorkerManager)
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

// Also handle parent disconnect (nodemon kill / parent crash)
process.on("disconnect", shutdown);

// Start the consumer — this keeps the process alive because the
// amqplib connection holds an open TCP socket.
start().catch((err) => {
  console.error(`[${workerId}] Fatal startup error:`, err);
  process.exit(1);
});
