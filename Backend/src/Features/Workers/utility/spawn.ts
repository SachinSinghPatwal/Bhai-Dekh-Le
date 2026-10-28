import { ChildProcess, fork } from "node:child_process";
import { readyStatus, Logger } from "../index.js";
import { handleTerminalIpcMessage } from "../../../utility/TerminalProgress.js";

const waitForWorkerReady = readyStatus;
const log = Logger;

interface CREATE_WORKER {
  workerId: string;
  workerPath: string;
}

interface SPAWN_WORKERS extends CREATE_WORKER {
  workers: ChildProcess[];
  isShuttingDown: () => boolean;
}

function createWorker({ workerId, workerPath }: CREATE_WORKER): ChildProcess {
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
  isShuttingDown,
}: SPAWN_WORKERS): Promise<ChildProcess> {
  if (isShuttingDown()) {
    throw new Error(`Cannot spawn ${workerId}: manager is shutting down.`);
  }

  const worker = createWorker({
    workerId,
    workerPath,
  });

  workers.push(worker);

  log.debug(`${workerId} spawned. PID=${worker.pid}`);

  worker.on("message", (msg: any) => {
    if (msg && typeof msg === "object" && typeof msg.type === "string" && msg.type.startsWith("TERMINAL_")) {
      handleTerminalIpcMessage(msg);
    }
  });

  worker.on("error", (error) => {
    log.error(`[${workerId}] process error: ${error}`);
  });

  worker.once("exit", (code, signal) => {
    log.info(`[${workerId}] exited. code=${code}, signal=${signal}`);

    const index = workers.indexOf(worker);

    if (index !== -1) {
      workers.splice(index, 1);
    }

    if (isShuttingDown()) {
      return;
    }

    if (code === 0) {
      return;
    }

    log.warn(
      `[${workerId}] crashed. Restarting in ${WORKER_RESTART_DELAY / 1000}s...`,
    );

    setTimeout(async () => {
      if (isShuttingDown()) {
        return;
      }

      try {
        const respawned = await spawnWorker({
          workerId,
          workerPath,
          workers,
          isShuttingDown,
        });

        log.success(`[${workerId}] restarted. PID=${respawned.pid}`);
      } catch (error) {
        log.error(`[${workerId}] failed to restart: ${error}`);
      }
    }, WORKER_RESTART_DELAY);
  });

  try {
    await waitForWorkerReady(worker, workerId);
  } catch (error) {
    if (worker.exitCode === null && worker.signalCode === null) {
      worker.kill("SIGTERM");
    }

    throw error;
  }

  return worker;
}
