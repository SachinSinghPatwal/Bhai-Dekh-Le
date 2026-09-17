import { ChildProcess } from "node:child_process";

export function shutdown(shuttingDown:boolean,workers:ChildProcess[]) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log("Shutting down workers...");

  for (const worker of workers) {
    if (!worker.killed) {
      worker.kill("SIGTERM");
    }
  }
}
