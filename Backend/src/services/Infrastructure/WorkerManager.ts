import { ChildProcess, fork } from "node:child_process";

export function startScrapConsumer() {
  const workers:ChildProcess[] = [];
  const NUMBER_OF_WORKERS: string = process.env.WORKER_COUNT!;

  for (let i = 1; i <= Number(NUMBER_OF_WORKERS); i++) {
    const worker = fork("./consumer/ScheduleScrapWorker.js", {
      env: {
        ...process.env,
        WORKER_ID: `worker-${i}`,
      },
    });
    workers.push(worker);
    console.log("child process Listeners :", i);
  }

  function shutdown() {
    console.log("Shutting down workers...");
  
    for (const worker of workers) {
      worker.kill("SIGTERM");
    }
  
    process.exit(0);
  }
  
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

