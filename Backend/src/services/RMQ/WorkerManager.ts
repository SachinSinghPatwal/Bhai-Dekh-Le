import { ChildProcess, fork } from "node:child_process";
import path from "node:path";
import { shutdown } from "../../utility/workers/shutdown.js";
import spawnWorker from "../../utility/workers/spawn.js";

const workerPath = path.resolve(
  process.cwd(),
  "src",
  "services",
  "RMQ",
  "consumer",
  "ScheduleScrapWorker.ts",
);

let workers: ChildProcess[] = [];
let shuttingDown = false;


export async function startScrapConsumer(): Promise<void> {
  /*
   * Defensive cleanup.
   *
   * Normally workers should already be gone, but this protects
   * against startScrapConsumer() being called again.
   */
  if (workers.length > 0) {
    console.log("Stopping existing workers before starting new ones...");

    await shutdown(workers, () => {
      shuttingDown = true;
    });

    workers = [];
  }

  shuttingDown = false;

  const workerCount = Number(
    process.env.WORKER_COUNT ?? 4,
  );

  const readyPromises: Promise<ChildProcess>[] = [];

  for (let i = 1; i <= workerCount; i++) {
    const workerId = `worker-${i}`;

    readyPromises.push(
      spawnWorker({
        workerId,
        workerPath,
        workers,
        shuttingDown,
      }),
    );
  }

  /*
   * Every worker must be ready before the function resolves.
   */
  await Promise.all(readyPromises);

  console.log(
    `All ${workerCount} workers are listening for queue messages.`,
  );
}

/*
 * Nodemon / Ctrl+C / process termination.
 *
 * IMPORTANT:
 * We perform asynchronous cleanup here, rather than
 * waiting for the "exit" event.
 */
async function handleShutdown(): Promise<void> {
  if (shuttingDown) return;

  await shutdown(workers, () => {
    shuttingDown = true;
  });

  workers = [];

  console.log("Manager shutdown complete.");

  process.exit(0);
}

process.once("SIGINT", () => {
  void handleShutdown();
});

process.once("SIGTERM", () => {
  void handleShutdown();
});

process.once("SIGUSR2", () => {
  void handleShutdown();
});