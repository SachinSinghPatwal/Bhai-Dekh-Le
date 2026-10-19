import Logger from "../../utility/Logger.js";
import { MONGO_DB_NAME } from "../../constants.js";

import connectToDb from "./utility/connectToDb.js";
import { killAllWorkers as killAll } from "./utility/killAll.js";
import readyStatus from "./utility/readyStatus.js";
import { shutdown } from "./utility/shutdown.js";
import spawn from "./utility/spawn.js";

const log = Logger;
const connectToMongoDb = connectToDb;
const killAllWorkers = killAll;
const waitForWorkerReady = readyStatus;
const spawnWorker = spawn;

export {
  Logger,
  log,
  MONGO_DB_NAME,

  connectToDb,
  connectToMongoDb,
  killAll,
  killAllWorkers,
  readyStatus,
  waitForWorkerReady,
  shutdown,
  spawn,
  spawnWorker,
};
