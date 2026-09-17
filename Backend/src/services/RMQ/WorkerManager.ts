import { ChildProcess, fork } from "node:child_process";
import path from "node:path";
import { killAllWorkers } from "../../utility/workers/killAllWorker.js";
import { shutdown } from "../../utility/workers/shutdown.js";

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

/**
 * Spawn consumer workers. Kills any previously spawned workers first
 * so they don't pile up across nodemon restarts or repeated calls.
 *
 * Resolves only after ALL workers have connected to RabbitMQ and are
 * actively consuming — so it's safe to publish immediately after.
 */
export async function startScrapConsumer() {
  // Tear down previous workers first
  await killAllWorkers(workers);

  shuttingDown = false;

  const workerCount = Number(process.env.WORKER_COUNT ?? 5);

  const readyPromises: Promise<void>[] = [];

  for (let i = 1; i <= workerCount; i++) {
    const workerId = `worker-${i}`;

    const worker = fork(workerPath, {
      execArgv: ["--import", "tsx"],

      env: {
        ...process.env,
        WORKER_ID: workerId,
      },
    });

    workers.push(worker);

    // Wait for this worker to signal it's ready (queue bound + consuming)
    const ready = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${workerId} did not become ready within 30s`));
      }, 30_000);

      worker.on("message", (msg: any) => {
        if (msg?.type === "ready") {
          clearTimeout(timeout);
          console.log(`${workerId} is ready`);
          resolve();
        }
      });

      worker.once("exit", (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`${workerId} exited with code ${code} before ready`));
        }
      });
    });

    readyPromises.push(ready);

    worker.on("exit", (code, signal) => {
      console.log(`${workerId} exited. code=${code}, signal=${signal}`);

      // Auto-restart only on actual crashes (positive exit code).
      // Signal kills (SIGTERM) set code=null — those are intentional, not crashes.
      if (!shuttingDown && code !== null && code !== 0) {
        console.log(`${workerId} crashed — restarting in 3s...`);

        setTimeout(() => {
          if (shuttingDown) return;

          const respawned = fork(workerPath, {
            execArgv: ["--import", "tsx"],
            env: {
              ...process.env,
              WORKER_ID: workerId,
            },
          });

          // Replace the dead worker in the array
          const idx = workers.indexOf(worker);
          if (idx !== -1) workers[idx] = respawned;
          else workers.push(respawned);

          console.log(`${workerId} restarted`);
        }, 3000);
      }
    });

    worker.on("error", (error) => {
      console.error(`${workerId} error:`, error);
    });
  }

  // Wait for ALL workers to be ready before returning
  await Promise.all(readyPromises);

  console.log("All workers listening Queue messages");
}

// On Windows, nodemon sends 'exit' on the process rather than SIGTERM.
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
process.once("SIGUSR2", shutdown);

// 'beforeExit' won't fire while the event loop is busy, but 'exit' always does.
process.once("exit", () => {
  for (const worker of workers) {
    if (!worker.killed) {
      worker.kill("SIGTERM");
    }
  }
});
