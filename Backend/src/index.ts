import "./config/load-env.js";

import app from "./app.js";
import connectToMongoDb from "./db/MongoDb.js";
import log from "./utility/Logger.js";

import {
  startScrapConsumer,
  handleShutdown as handleScrapWorkerShutdown,
} from "./services/RMQ/ScrapWorkerManager.js";

import {
  startDbWorkers,
  handleDbWorkerShutdown,
} from "./services/RMQ/DbWorkerManager.js";

const port = Number(process.env.PORT) || 8000;

let shuttingDown = false;

app.listen(port, "0.0.0.0", () => {
  log.success(`Server is running on ${port}`);
});

async function handleShutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  log.info("Application shutting down...");

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

    log.success("Application shutdown complete.");
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

connectToMongoDb()
  .then(async () => {
    log.success("MongoDB connected");

    await startScrapConsumer();

    await startDbWorkers();

    log.success("All workers started.");
  })
  .catch((err: unknown) => {
    log.error("MongoDB connection or worker startup failed:", err);
  });
