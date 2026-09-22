import { ChildProcess } from "node:child_process";
import log from "../../../utility/Logger.js";

export default function waitForWorkerReady(
  worker: ChildProcess,
  workerId: string,
): Promise<void> {
  const WORKER_READY_TIMEOUT = 30_000;

  return new Promise((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;

      reject(
        new Error(
          `${workerId} did not become ready within ${
            WORKER_READY_TIMEOUT / 1000
          }s`,
        ),
      );
    }, WORKER_READY_TIMEOUT);

    worker.once("message", (msg: any) => {
      if (settled) {
        return;
      }

      if (msg?.type !== "ready") {
        return;
      }

      settled = true;

      clearTimeout(timeout);

      log.success(`${workerId} is ready`);

      resolve();
    });

    worker.once("exit", (code, signal) => {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timeout);

      reject(
        new Error(
          `${workerId} exited before becoming ready. ` +
            `code=${code}, signal=${signal}`,
        ),
      );
    });
  });
}
