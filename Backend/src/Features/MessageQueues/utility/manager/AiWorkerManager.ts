import { ChildProcess } from "node:child_process";
import path from "node:path";
import { shutdown, spawn, Logger } from "../../index.js";

const spawnWorker = spawn;
const log = Logger;

const aiWorkerPath = path.resolve(
  process.cwd(),
  "src",
  "Features",
  "MessageQueues",
  "service",
  "consumer",
  "AiWorker.ts",
);

let aiWorkers: ChildProcess[] = [];
let shuttingDown = false;

export async function startAiWorkers(): Promise<void> {
  if (aiWorkers.length > 0) {
    log.warn("Stopping existing AI evaluation workers...");
    shuttingDown = true;
    await shutdown(aiWorkers, () => {
      shuttingDown = true;
    });
    aiWorkers = [];
  }

  shuttingDown = false;
  const workerCount = Number(process.env.AI_WORKER_COUNT ?? 1);
  const readyPromises: Promise<ChildProcess>[] = [];

  for (let i = 1; i <= workerCount; i++) {
    const workerId = `ai-worker-${i}`;
    readyPromises.push(
      spawnWorker({
        workerId,
        workerPath: aiWorkerPath,
        workers: aiWorkers,
        isShuttingDown: () => shuttingDown,
      }),
    );
  }

  await Promise.all(readyPromises);
  log.debug(`All AI evaluation workers are listening.`);
}

export async function handleAiWorkerShutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await shutdown(aiWorkers, () => {
    shuttingDown = true;
  });
  aiWorkers = [];
  log.debug("AI evaluation worker manager shutdown complete.");
}

const AiWorkerManager = {
  startAiWorkers,
  handleAiWorkerShutdown,
};

export default AiWorkerManager;
