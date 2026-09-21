import type { ChildProcess } from "node:child_process";

const WORKER_SHUTDOWN_TIMEOUT = 10_000;

function stopWorker(worker: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    // Worker has already exited.
    if (worker.exitCode !== null || worker.signalCode !== null) {
      resolve();
      return;
    }

    let settled = false;

    const finish = () => {
      if (settled) return;

      settled = true;
      clearTimeout(timeout);
      resolve();
    };

    const timeout = setTimeout(() => {
      console.warn(
        `Worker PID ${worker.pid} did not shut down gracefully. Force killing.`,
      );

      // SIGKILL is the final fallback.
      worker.kill("SIGKILL");

      finish();
    }, WORKER_SHUTDOWN_TIMEOUT);

    worker.once("exit", finish);

    console.log(`Stopping worker PID ${worker.pid}...`);

    // Ask the worker to gracefully shut down.
    worker.kill("SIGTERM");
  });
}

export async function shutdown(
  workers: ChildProcess[],
  setShuttingDown: () => void,
): Promise<void> {
  setShuttingDown();

  console.log("Shutting down workers...");

  await Promise.all(workers.map((worker) => stopWorker(worker)));

  console.log("All workers stopped.");
}
