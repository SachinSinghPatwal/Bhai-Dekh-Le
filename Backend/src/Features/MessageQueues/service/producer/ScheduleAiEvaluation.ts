import amqp from "amqplib";
import {
  Logger,
  aiEvaluationExchange,
  aiEvaluationQueue,
  aiEvaluationDlx,
  aiEvaluationDlq,
  aiEvaluationRoutingKey,
  aiEvaluationDlqRoutingKey,
  QUEUE_MESSAGE_TTL_MS,
} from "../../index.js";
import { safeAssertConfirmQueue } from "../../helpers/safeAssertQueue.js";
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
    let channel = await connection.createConfirmChannel();

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

    const asserted = await safeAssertConfirmQueue(
      connection,
      channel,
      aiEvaluationQueue,
      {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": aiEvaluationDlx,
          "x-dead-letter-routing-key": aiEvaluationDlqRoutingKey,
          "x-message-ttl": QUEUE_MESSAGE_TTL_MS,
        },
      },
    );
    channel = asserted.channel;

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
        expiration: String(QUEUE_MESSAGE_TTL_MS),
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
