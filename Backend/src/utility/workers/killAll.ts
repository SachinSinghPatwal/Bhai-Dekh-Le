import { ChildProcess } from "node:child_process";

export async function killAllWorkers(workers: ChildProcess[]): Promise<void> {
  if (workers.length === 0) {
    return;
  }

  console.log("Killing existing workers...");

  await Promise.all(
    workers.map(
      (worker) =>
        new Promise<void>((resolve) => {
          if (worker.exitCode !== null || worker.signalCode !== null) {
            resolve();
            return;
          }

          worker.once("exit", () => {
            resolve();
          });

          worker.kill("SIGTERM");
        }),
    ),
  );
}
