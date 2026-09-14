import { fork } from "node:child_process";

const NUMBER_OF_WORKERS:string = process.env.WORKER_COUNT!;

for (let i = 1; i <= Number(NUMBER_OF_WORKERS); i++) {
  fork("./ScheduleScrapWorker.js", {
    env: {
      ...process.env,
      WORKER_ID: `worker-${i}`,
    },
  });
  console.log("child process :",i)
}
