import "./config/load-env.js";

import app from "./app.js";
import connectToMongoDb from "./db/MongoDb.js";
import log from "./utility/Logger.js";

import {
  startScrapConsumer,
  handleShutdown as handleScrapWorkerShutdown,
} from "./Features/MessageQueues/utility/manager/ScrapWorkerManager.js";

import {
  startDbWorkers,
  handleDbWorkerShutdown,
} from "./Features/MessageQueues/utility/manager/DbWorkerManager.js";

import {
  startAiWorkers,
  handleAiWorkerShutdown,
} from "./Features/MessageQueues/utility/manager/AiWorkerManager.js";

import { ensureBasicUserInformation } from "./Features/UserInteractions/index.js";
import cleanupStaleSnapshots from "./helper/cleanupStaleSnapshots.js";
import { startSpinningLoader } from "./utility/TerminalProgress.js";
import ScheduleScrapeJob from "./Features/MessageQueues/service/producer/ScheduleScrape.js";

await ensureBasicUserInformation();
await cleanupStaleSnapshots();

const port = Number(process.env.PORT) || 8000;
let shuttingDown = false;

app.listen(port, "0.0.0.0", () => {
  log.info(`Server is running on ${port}`);
});

async function handleShutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log.debug("Application shutting down...");

  try {
    await handleScrapWorkerShutdown();
    await handleDbWorkerShutdown();
    await handleAiWorkerShutdown();
    log.debug("Application shutdown complete.");
  } catch (error) {
    log.error("Application shutdown error:", error);
  } finally {
    process.exit(0);
  }
}

process.once("SIGINT", () => {
  void handleShutdown();
});

process.once("SIGTERM", () => {
  void handleShutdown();
});

process.once("SIGUSR2", () => {
  void handleShutdown();
});

const initLoader = startSpinningLoader("Initializing workers and queue listeners...");

connectToMongoDb()
  .then(async (connected) => {
    await startScrapConsumer();

    if (connected && process.env.MONGO_URI) {
      await startDbWorkers();
    }

    await startAiWorkers();
    initLoader.stop("All Scrap, DB, and AI workers initialized and listening to queues.");

    if (process.env.AUTO_SCRAPE !== "false") {
      await ScheduleScrapeJob();
    }
  })
  .catch((err: unknown) => {
    initLoader.fail(`Worker startup failed: ${err}`);
  });
