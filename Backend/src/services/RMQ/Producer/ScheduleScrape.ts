import amqp from "amqplib";
import { ScheduleScrape } from "../../../constants.js";

export default async function ScheduleScrapping(): Promise<void> {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL ?? "amqp://admin:admin123@localhost:5672",
  );

  try {
    console.log("=== Producer CONNECTED ===");

    // Confirm channel guarantees the broker has received the message
    // before we close the connection.
    const channel = await connection.createConfirmChannel();

    await channel.assertExchange(ScheduleScrape, "direct", {
      durable: true,
      autoDelete: false,
    });

    const message = "scrapping";

    channel.publish(ScheduleScrape, "Scrapper", Buffer.from(message), {
      persistent: true,
    });

    // Wait for broker to confirm it received and persisted the message
    await channel.waitForConfirms();

    console.log(`Message published and confirmed: ${message}`);

    await channel.close();
  } finally {
    await connection.close();

    console.log("Producer connection closed");
  }
}
