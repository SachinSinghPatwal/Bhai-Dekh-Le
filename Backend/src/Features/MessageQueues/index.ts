import type { ConfirmChannel, Message } from "amqplib";
import type { JOB_DETAILS } from "../../models/Mongo/job.models.js";
import { JobModel } from "../../models/Mongo/job.models.js";
import Logger from "../../utility/Logger.js";
import {
  dbSave,
  dbSaveExchange,
  dbSaveDlx,
  dbSaveDlq,
  dbSaveDlqRoutingKey,
  ScheduleScrape,
  scrapeDlx,
  scrapeDlq,
  scrapeDlqRoutingKey,
  SCRAPING_PLATFORMS,
  aiEvaluationExchange,
  aiEvaluationQueue,
  aiEvaluationDlx,
  aiEvaluationDlq,
  aiEvaluationRoutingKey,
  aiEvaluationDlqRoutingKey,
} from "../../constants.js";
import SaveSnapShots from "../../helper/SaveSnapShots.js";
import cleanupStaleSnapshots from "../../helper/cleanupStaleSnapshots.js";

import connectToDb from "../Workers/utility/connectToDb.js";
import { shutdown } from "../Workers/utility/shutdown.js";
import spawn from "../Workers/utility/spawn.js";

import naukriJDScrap from "../Scrapping/services/naukri/naukriJDScrap.js";
import PlatformInitialization from "../Scrapping/services/PlatformInitialization.js";

import DistributingWork from "./helpers/DistributingWork.js";
import TransferingWorkToNextQueue from "./helpers/TransferingWorkToNextQueue.js";
import ScheduleJdScrape from "./service/producer/ScheduleJdScrape.js";
import ScheduleScrapeJob from "./service/producer/ScheduleScrape.js";
import ScheduleAiEvaluation from "./service/producer/ScheduleAiEvaluation.js";
import DbWorkerManager, { startDbWorkers, handleDbWorkerShutdown } from "./utility/manager/DbWorkerManager.js";
import ScrapWorkerManager, { startScrapConsumer, handleShutdown as handleScrapWorkerShutdown } from "./utility/manager/ScrapWorkerManager.js";
import AiWorkerManager, { startAiWorkers, handleAiWorkerShutdown } from "./utility/manager/AiWorkerManager.js";

const log = Logger;
const saveSnapShots = SaveSnapShots;
const connectToMongoDb = connectToDb;
const spawnWorker = spawn;
const DistributingLoadWithWorkers = DistributingWork;
const sendToAnotherQueue = TransferingWorkToNextQueue;

export {
  type ConfirmChannel,
  type Message,
  type JOB_DETAILS,

  Logger,
  log,
  JobModel,
  dbSave,
  dbSaveExchange,
  dbSaveDlx,
  dbSaveDlq,
  dbSaveDlqRoutingKey,
  ScheduleScrape,
  scrapeDlx,
  scrapeDlq,
  scrapeDlqRoutingKey,
  SCRAPING_PLATFORMS,
  aiEvaluationExchange,
  aiEvaluationQueue,
  aiEvaluationDlx,
  aiEvaluationDlq,
  aiEvaluationRoutingKey,
  aiEvaluationDlqRoutingKey,
  SaveSnapShots,
  saveSnapShots,
  cleanupStaleSnapshots,
  connectToDb,
  connectToMongoDb,
  shutdown,
  spawn,
  spawnWorker,
  naukriJDScrap,
  PlatformInitialization,

  DistributingWork,
  DistributingLoadWithWorkers,
  TransferingWorkToNextQueue,
  sendToAnotherQueue,
  ScheduleJdScrape,
  ScheduleScrapeJob,
  ScheduleAiEvaluation,
  DbWorkerManager,
  startDbWorkers,
  handleDbWorkerShutdown,
  ScrapWorkerManager,
  startScrapConsumer,
  handleScrapWorkerShutdown,
  AiWorkerManager,
  startAiWorkers,
  handleAiWorkerShutdown,
};
