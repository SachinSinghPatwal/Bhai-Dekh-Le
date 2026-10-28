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
import { ensureBasicUserInformation } from "./Features/UserInteractions/index.js";
import cleanupStaleSnapshots from "./helper/cleanupStaleSnapshots.js";
import { startSpinningLoader } from "./utility/TerminalProgress.js";
import ScheduleScrapeJob from "./Features/MessageQueues/service/producer/ScheduleScrape.js";

// 1. Ensure user resume & job preference profile exists before starting the server
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
    /*
     * Stop scraper workers first.
     *
     * This prevents new scrape results from
     * being produced while we shut down the
     * DB workers.
     */
    await handleScrapWorkerShutdown();

    /*
     * Now stop DB workers.
     */
    await handleDbWorkerShutdown();

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
      initLoader.stop("All Scrap and DB workers initialized and listening to queues.");
      if (process.env.AUTO_SCRAPE !== "false") {
        await ScheduleScrapeJob();
      }
    } else {
      initLoader.stop("Scraper workers initialized (DB workers suspended).");



    }
  })
  .catch((err: unknown) => {
    initLoader.fail(`Worker startup failed: ${err}`);
  });
