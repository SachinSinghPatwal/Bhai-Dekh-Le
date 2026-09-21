import { ChildProcess, fork } from "node:child_process";
import waitForWorkerReady from "./readyStatus.js";

interface CREATE_WORKER {
  workerId: string;
  workerPath: string;
}

interface SPAWN_WORKERS extends CREATE_WORKER {
  workers: ChildProcess[];
  shuttingDown: boolean;
}

function createWorker({
  workerId,
  workerPath,
}: CREATE_WORKER): ChildProcess {
  return fork(workerPath, {
    execArgv: ["--import", "tsx"],

    env: {
      ...process.env,
      WORKER_ID: workerId,
    },
  });
}

const WORKER_RESTART_DELAY = 3_000;

export default async function spawnWorker({
  workerId,
  workerPath,
  workers,
  shuttingDown,
}: SPAWN_WORKERS): Promise<ChildProcess> {
  const worker = createWorker({ workerId, workerPath });

  workers.push(worker);

  console.log(`${workerId} spawned. PID=${worker.pid}`);

  worker.on("error", (error) => {
    console.error(`[${workerId}] process error:`, error);
  });

  worker.on("exit", (code, signal) => {
    console.log(`[${workerId}] exited. code=${code}, signal=${signal}`);

    if (!shuttingDown && code !== null && code !== 0) {
      console.log(
        `[${workerId}] crashed. Restarting in ${WORKER_RESTART_DELAY / 1000}s...`,
      );

      setTimeout(async () => {
        if (shuttingDown) return;

        try {
          const respawned = await spawnWorker({
            workerId,
            workerPath,
            workers,
            shuttingDown,
          });

          console.log(`[${workerId}] restarted. PID=${respawned.pid}`);
        } catch (error) {
          console.error(`[${workerId}] failed to restart:`, error);
        }
      }, WORKER_RESTART_DELAY);
    }
  });

  try {
    await waitForWorkerReady(worker, workerId);
  } catch (error) {
    /*
     * The worker failed during startup.
     *
     * Kill it if it is still alive so that we don't leave
     * a partially initialized worker behind.
     */
    if (worker.exitCode === null && worker.signalCode === null) {
      worker.kill("SIGTERM");
    }

    throw error;
  }

  return worker;
}
