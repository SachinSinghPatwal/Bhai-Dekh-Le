import type { ChildProcess } from "node:child_process";
import log from "../Logger.js";

const WORKER_SHUTDOWN_TIMEOUT = 10_000;

function stopWorker(worker: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    /*
     * Already exited.
     */
    if (worker.exitCode !== null || worker.signalCode !== null) {
      resolve();
      return;
    }

    let settled = false;

    let timeout: NodeJS.Timeout | undefined;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      resolve();
    };

    worker.once("exit", finish);

    timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      log.warn(
        `Worker PID ${worker.pid} did not shut down gracefully. Force killing.`,
      );

      /*
       * Final fallback.
       */
      worker.kill("SIGKILL");

      /*
       * We no longer wait indefinitely for this worker.
       */
      finish();
    }, WORKER_SHUTDOWN_TIMEOUT);

    log.info(`Stopping worker PID ${worker.pid}...`);

    /*
     * Ask the worker to execute its own
     * graceful shutdown().
     */
    worker.kill("SIGTERM");
  });
}

export async function shutdown(
  workers: ChildProcess[],
  setShuttingDown: () => void,
): Promise<void> {
  setShuttingDown();

  log.info("Shutting down workers...");

  /*
   * All workers can receive SIGTERM at the same time.
   */
  await Promise.all(workers.map((worker) => stopWorker(worker)));

  log.success("All workers stopped.");
}
