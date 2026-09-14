import amqp from "amqplib";
import { ScheduleScrape } from "../../../../constants.js";

export default async function (): Promise<void> {
  const connection = await amqp.connect(
    "amqp://rabbitmq-4-management-x53s:5672/",
  );

  console.log("===CONNECTED WITH ADMIN USER===");

  const channel = await connection.createChannel();

  await channel.assertExchange(ScheduleScrape, "direct", {
    durable: true,
    autoDelete: true,
  });

  console.log("\n DIRECT Exchange Demo started - sending every 10 seconds");

  for (const { key, msg } of messages) {
    channel.publish(ScheduleScrape, key, Buffer.from(msg));
  }
  console.log("\n All messages sent. closing connection");
  setTimeout(() => {
    connection.close();
  }, 500);
}
