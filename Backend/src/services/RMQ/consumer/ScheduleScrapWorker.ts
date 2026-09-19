import "../../../config/load-env.js";
import amqp, { type Message } from "amqplib";
import { ScheduleScrape } from "../../../constants.js";
import Scrapper from "../../Scrapper.js";
import { JobModel } from "../../../models/Mongo/job.models.js";

const workerId = process.env.WORKER_ID ?? `worker-unknown`;

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>["createChannel"]>
> | null = null;

async function start() {
  connection = await amqp.connect(process.env.RABBITMQ_URL_WITH_CREDENTIALS!);

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

  await channel.consume(ScheduleScrape, async (message: Message | null) => {
    if (!message) return;

    console.log(`[${workerId}] Received: ${message.content.toString()}`);

    try {
      // worker.ts
      console.log("PID:", process.pid, "PPID:", process.ppid);
      const response = await Scrapper(workerId);
      let dbResponse ;
      if (Array.isArray(response) && response.length > 0) {
        await JobModel.bulkWrite(
          dbResponse = response.map((each) => ({
            updateOne: {
              filter: { jobId: each.jobId },
              update: { $set: each },
              upsert: true,
            },
          })),
        );
        if(!dbResponse){throw Error("Something went WRONG while inserting data into the DB")}
      }
      channel!.ack(message);
    } catch (error) {
      console.error(`[${workerId}] Scraping failed:`, error);
      channel!.nack(message, false, true);
    }
  });

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
process.once("SIGUSR2", shutdown); // Nodemon restart signal

// Also handle parent disconnect (nodemon kill / parent crash)
process.on("disconnect", shutdown);

// Start the consumer — this keeps the process alive because the
// amqplib connection holds an open TCP socket.
start().catch((err) => {
  console.error(`[${workerId}] Fatal startup error:`, err);
  process.exit(1);
});
