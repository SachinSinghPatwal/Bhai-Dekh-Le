import amqp from "amqplib";
import { ScheduleScrape } from "../../../../constants.js";

export default async function Scrapper(): Promise<void> {
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

  const work = {
    key: "Scrapper",
    Theme: "scrapping",
  };
  channel.publish(ScheduleScrape, work.key, Buffer.from(work.Theme));
  console.log("\n Messages sent. closing connection");
}
