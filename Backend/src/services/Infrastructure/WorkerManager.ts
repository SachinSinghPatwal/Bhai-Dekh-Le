import { ChildProcess, fork } from "node:child_process";
import path from "node:path";

export function startScrapConsumer() {
  const workerPath = path.resolve(
    process.cwd(),
    "src",
    "services",
    "Infrastructure",
    "RMQ",
    "consumer",
    "ScheduleScrapWorker.ts",
  );

  const workers: ChildProcess[] = [];

  const workerCount = Number(process.env.WORKER_COUNT ?? 4);

  console.log(`Starting ${workerCount} workers...`);

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

    console.log(`${workerId} started`);

    worker.on("exit", (code, signal) => {
      console.log(`${workerId} exited. code=${code}, signal=${signal}`);
    });

    worker.on("error", (error) => {
      console.error(`${workerId} error:`, error);
    });
  }

  let shuttingDown = false;

  function shutdown() {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    console.log("Shutting down workers...");

    for (const worker of workers) {
      if (!worker.killed) {
        worker.kill("SIGTERM");
      }
    }
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
