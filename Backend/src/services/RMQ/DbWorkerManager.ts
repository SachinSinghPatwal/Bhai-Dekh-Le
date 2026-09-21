import { ChildProcess } from "node:child_process";
import path from "node:path";

import { shutdown } from "../../utility/workers/shutdown.js";
import spawnWorker from "../../utility/workers/spawn.js";
import log from "../../utility/Logger.js";

const dbWorkerPath = path.resolve(
  process.cwd(),
  "src",
  "services",
  "RMQ",
  "consumer",
  "DbWorker.ts",
);

let dbWorkers: ChildProcess[] = [];

let shuttingDown = false;

export async function startDbWorkers(): Promise<void> {
  /*
   * Defensive cleanup if this function
   * is called more than once.
   */
  if (dbWorkers.length > 0) {
    log.warn("Stopping existing DB workers...");

    shuttingDown = true;

    await shutdown(dbWorkers, () => {
      shuttingDown = true;
    });

    dbWorkers = [];
  }

  shuttingDown = false;

  const workerCount = Number(process.env.DB_WORKER_COUNT ?? 2);

  const readyPromises: Promise<ChildProcess>[] = [];

  for (let i = 1; i <= workerCount; i++) {
    const workerId = `db-worker-${i}`;

    readyPromises.push(
      spawnWorker({
        workerId,
        workerPath: dbWorkerPath,
        workers: dbWorkers,

        /*
         * Always read the CURRENT shutdown state.
         */
        isShuttingDown: () => shuttingDown,
      }),
    );
  }

  await Promise.all(readyPromises);

  log.success(`All ${workerCount} DB workers are listening.`);
}

export async function handleDbWorkerShutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  await shutdown(dbWorkers, () => {
    shuttingDown = true;
  });

  dbWorkers = [];

  log.success("DB worker manager shutdown complete.");
}
