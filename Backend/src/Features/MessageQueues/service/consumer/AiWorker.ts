const parentPid = process.ppid;
if (parentPid) {
  setInterval(() => {
    try {
      process.kill(parentPid, 0);
    } catch {
      process.exit(0);
    }
  }, 2000);
}
import "../../../../config/load-env.js";
import amqp, { type Message, type Channel } from "amqplib";
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
import {
  loadResumeBuffer,
  rateResumeAgainstJDs,
  displayRatingReportOnTerminal,
  type ScrapedJobDescription,
} from "../../../Scrapping/services/naukri/naukriJDScrap.js";
import { startSpinningLoader } from "../../../../utility/TerminalProgress.js";
import { safeAssertQueue } from "../../helpers/safeAssertQueue.js";

const log = Logger;
const workerId = process.env.WORKER_ID ?? "ai-worker-1";

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Channel | null = null;
let shuttingDown = false;

async function start(): Promise<void> {
  connection = await amqp.connect(process.env.RABBITMQ_URL_WITH_CREDENTIALS!);
  channel = await connection.createChannel();

  connection.on("error", (err) => {
    log.error(`[${workerId}] RabbitMQ connection error: ${err?.message ?? err}`);
  });

  channel.on("error", (err) => {
    log.error(`[${workerId}] RabbitMQ channel error: ${err?.message ?? err}`);
  });

  await channel.prefetch(1);

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

  const asserted = await safeAssertQueue(
    connection!,
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

  await channel.consume(aiEvaluationQueue, async (message: Message | null) => {
    if (!message || shuttingDown) {
      return;
    }

    try {
      let payload: { jds?: ScrapedJobDescription[]; workerId?: string };
      try {
        payload = JSON.parse(message.content.toString());
      } catch (_parseErr) {
        log.error(
          `[${workerId}] Discarding unparseable message: ${message.content.toString()}`,
        );
        channel?.ack(message);
        return;
      }

      const { jds = [] } = payload;
      if (!Array.isArray(jds) || jds.length === 0) {
        channel?.ack(message);
        log.info(`[${workerId}] Empty JD batch received. Task ACKed.`);
        return;
      }

      log.info(`[${workerId}] Received ${jds.length} JDs for AI evaluation.`);

      const resumeInfo = await loadResumeBuffer();
      if (!resumeInfo) {
        log.warn(
          `[${workerId}] No resume found — skipping AI rating. Drop a PDF into Backend/data/ to enable resume scoring. Task ACKed.`,
        );
        channel?.ack(message);
        return;
      }

      const { buffer: resumeBuffer, source: resumeSource } = resumeInfo;
      const maxRetries = 3;
      let attempt = 0;
      let isEvaluated = false;
      let lastError: any = null;

      while (attempt < maxRetries && !isEvaluated && !shuttingDown) {
        attempt++;
        const aiLoader = startSpinningLoader(
          `[${workerId}] Evaluating candidate resume against ${jds.length} JDs with Gemini AI (Attempt ${attempt}/${maxRetries})...`,
        );

        try {
          const ratingResult = await rateResumeAgainstJDs(jds, resumeBuffer);
          aiLoader.stop(`Gemini AI evaluation completed (${ratingResult.ratedJobs.length} qualifying matches).`);
          displayRatingReportOnTerminal(ratingResult, resumeSource);
          channel?.ack(message);
          isEvaluated = true;
          log.success(
            `[${workerId}] AI Evaluation completed successfully for ${ratingResult.ratedJobs.length} qualifying jobs.`,
          );
        } catch (err: any) {
          lastError = err;
          const rawErrMsg = err?.message ?? String(err);
          aiLoader.fail(`Gemini AI evaluation attempt ${attempt} failed: ${rawErrMsg}`);

          if (attempt < maxRetries && !shuttingDown) {
            const isRateLimit =
              rawErrMsg.includes("429") ||
              rawErrMsg.includes("RESOURCE_EXHAUSTED") ||
              rawErrMsg.includes("quota") ||
              err?.status === 429 ||
              err?.code === 429;

            const backoffMs = isRateLimit ? attempt * 5000 : attempt * 3000;
            log.warn(
              `[${workerId}] ${isRateLimit ? "Rate limit detected. " : ""}Retrying Gemini AI evaluation in ${backoffMs / 1000}s...`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!isEvaluated && !shuttingDown) {
        const errorDetail =
          typeof lastError === "object" && lastError !== null
            ? lastError.message || JSON.stringify(lastError)
            : String(lastError);

        log.error(
          `[${workerId}] Gemini AI evaluation failed after ${maxRetries} attempts. Routing task to DLQ (${aiEvaluationDlq}). Error: ${errorDetail}`,
        );

        try {
          // Explicitly publish the failed task with diagnostic metadata to DLQ
          const dlqPayload = {
            ...payload,
            error: {
              message: errorDetail,
              code: lastError?.code ?? lastError?.status ?? 429,
              stack: lastError?.stack,
            },
            failedAttempts: attempt,
            failedAt: new Date().toISOString(),
            routedByWorker: workerId,
          };

          const published = channel?.publish(
            aiEvaluationDlx,
            aiEvaluationDlqRoutingKey,
            Buffer.from(JSON.stringify(dlqPayload)),
            {
              persistent: true,
              headers: {
                "x-original-queue": aiEvaluationQueue,
                "x-exception-message": errorDetail.slice(0, 500),
                "x-retry-count": attempt,
              },
            },
          );

          if (!published) {
            channel?.sendToQueue(
              aiEvaluationDlq,
              Buffer.from(JSON.stringify(dlqPayload)),
              { persistent: true },
            );
          }

          // Acknowledge the message on aiEvaluationQueue to free the prefetch slot and conclude delegation
          channel?.ack(message);

          log.info(
            `[${workerId}] Task successfully delegated to DLQ (${aiEvaluationDlq}) and ACKed on ${aiEvaluationQueue}. Flow restored to normal state, waiting for next tasks.`,
          );
        } catch (dlqErr: any) {
          log.error(
            `[${workerId}] Failed during DLQ delegation: ${dlqErr?.message ?? dlqErr}`,
          );
          try {
            channel?.nack(message, false, false);
          } catch {}
        }
      }
    } catch (unhandledErr: any) {
      log.error(
        `[${workerId}] Unhandled exception in AI evaluation task: ${unhandledErr?.message ?? unhandledErr}`,
      );
      try {
        channel?.ack(message);
      } catch {}
    }
  });

  if (process.send) {
    process.send({
      type: "ready",
    });
  }
}

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log.info(`[${workerId}] Shutting down...`);

  try {
    await channel?.close();
    await connection?.close();
  } catch (error) {
    log.error(`[${workerId}] Shutdown error: ${error}`);
  }

  channel = null;
  connection = null;
  process.exit(0);
}

process.once("SIGTERM", () => {
  void shutdown();
});

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGUSR2", () => {
  void shutdown();
});

process.once("disconnect", () => {
  void shutdown();
});

start().catch((error) => {
  log.error(`[${workerId}] Fatal startup error: ${error}`);
  process.exit(1);
});
