import amqp from "amqplib";
import { ScheduleScrape } from "../../../constants.js";

export default async function ScheduleScrapping(): Promise<void> {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL ?? "amqp://admin:admin123@localhost:5672",
  );

  try {
    console.log("=== Producer CONNECTED ===");

    const channel = await connection.createChannel();

    await channel.assertExchange(ScheduleScrape, "direct", {
      durable: true,
      autoDelete: false,
    });

    const message = "scrapping";

    channel.publish(ScheduleScrape, "Scrapper", Buffer.from(message), {
      persistent: true,
    });

    console.log(`Message published: ${message}`);
  } finally {
    await connection.close();

    console.log("Producer connection closed");
  }
}
