import amqp from "amqplib";
import {
  Logger,
  aiEvaluationExchange,
  aiEvaluationQueue,
  aiEvaluationDlx,
  aiEvaluationDlq,
  aiEvaluationRoutingKey,
  aiEvaluationDlqRoutingKey,
} from "../../index.js";
import type { ScrapedJobDescription } from "../../../Scrapping/services/naukri/naukriJDScrap.js";

const log = Logger;

export default async function ScheduleAiEvaluation(
  jds: ScrapedJobDescription[],
  workerId: string = "unknown",
): Promise<void> {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL_WITH_CREDENTIALS!,
  );

  try {
    const channel = await connection.createConfirmChannel();

    await channel.assertExchange(aiEvaluationDlx, "direct", {
      durable: true,
      autoDelete: false,
    });

    await channel.assertQueue(aiEvaluationDlq, {
      durable: true,
    });

    await channel.bindQueue(
      aiEvaluationDlq,
      aiEvaluationDlx,
      aiEvaluationDlqRoutingKey,
    );

    await channel.assertExchange(aiEvaluationExchange, "direct", {
      durable: true,
      autoDelete: false,
    });

    await channel.assertQueue(aiEvaluationQueue, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": aiEvaluationDlx,
        "x-dead-letter-routing-key": aiEvaluationDlqRoutingKey,
      },
    });

    await channel.bindQueue(
      aiEvaluationQueue,
      aiEvaluationExchange,
      aiEvaluationRoutingKey,
    );

    channel.publish(
      aiEvaluationExchange,
      aiEvaluationRoutingKey,
      Buffer.from(
        JSON.stringify({
          jds,
          workerId,
          enqueuedAt: new Date().toISOString(),
        }),
      ),
      {
        persistent: true,
      },
    );

    await channel.waitForConfirms();
    log.success(
      `[${workerId}] Published ${jds.length} JDs to AI evaluation queue (${aiEvaluationQueue}).`,
    );

    await channel.close();
  } finally {
    await connection.close();
  }
}
