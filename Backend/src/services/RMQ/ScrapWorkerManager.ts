import { ChildProcess } from "node:child_process";
import path from "node:path";

import { shutdown } from "../../utility/workers/shutdown.js";
import spawnWorker from "../../utility/workers/spawn.js";
import log from "../../utility/Logger.js";

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
   * Defensive cleanup if this function
   * is called more than once.
   */
  if (workers.length > 0) {
    log.warn("Stopping existing scraper workers...");

    shuttingDown = true;

    await shutdown(workers, () => {
      shuttingDown = true;
    });

    workers = [];
  }

  shuttingDown = false;

  const workerCount = Number(process.env.SCRAP_WORKER_COUNT ?? 4);

  const readyPromises: Promise<ChildProcess>[] = [];

  for (let i = 1; i <= workerCount; i++) {
    const workerId = `worker-${i}`;

    readyPromises.push(
      spawnWorker({
        workerId,
        workerPath,
        workers,

        /*
         * Pass a function so spawnWorker
         * always sees the current state.
         */
        isShuttingDown: () => shuttingDown,
      }),
    );
  }

  await Promise.all(readyPromises);

  log.success(`All ${workerCount} scraper workers are listening.`);
}

export async function handleShutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  await shutdown(workers, () => {
    shuttingDown = true;
  });

  workers = [];

  log.success("Scraper worker manager shutdown complete.");
}
