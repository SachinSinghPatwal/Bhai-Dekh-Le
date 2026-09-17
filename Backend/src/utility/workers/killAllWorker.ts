import { ChildProcess } from "node:child_process";


/**
 * Kill all existing workers and wait for them to exit.
 * Called before spawning a new batch or on process shutdown.
 */

export async function killAllWorkers(workers: ChildProcess[]): Promise<void> {
  if (workers.length === 0) return Promise.resolve();

  console.log("Killing existing workers...");

  return new Promise((resolve) => {
    let remaining = workers.length;

    function onDone() {
      remaining--;
      if (remaining <= 0) {
        workers = [];
        resolve();
      }
    }

    for (const worker of workers) {
      if (worker.exitCode !== null || worker.killed) {
        // Already dead
        onDone();
      } else {
        worker.once("exit", onDone);
        worker.kill("SIGTERM");
      }
    }
  });
}
