import type { JOB_DETAILS } from "../../models/Mongo/job.models.js";
import log from "../../utility/Logger.js";
import {
  PROXIES,
  JOB_AUTH_URL,
  dbSaveExchange,
  JOB_SEARCH_URL,
  AUTH_SELECTORS,
} from "../../constants.js";
import { getFileFolderNamingConvention } from "../../helper/SnapShotsFileNamingConvention.js";
import RaceForResponseOrTimeOut from "./utility/playwright/RaceForResponseOrTimeOut.js";
import { TimeoutError } from "../../utility/TimeOutError.js";
import {
  NEW_ENVIRONMENT_DUE_TO_CRASH_PARAMS_TYPES,
  NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES,
} from "../../types.js";
import sendToAnotherQueue from "../MessageQueues/helpers/TransferingWorkToNextQueue.js";

import { RateLimitError } from "./utility/playwright/RateLimitingError.js";
import getDesiredJobs from "./services/GetDesiredJobs.js";
import ComposeUrl from "./utility/ComposeUrl.js";
export {
  JOB_DETAILS,
  log,
  PROXIES,
  dbSaveExchange,
  JOB_AUTH_URL,
  AUTH_SELECTORS,
  getFileFolderNamingConvention,
  JOB_SEARCH_URL,
  RaceForResponseOrTimeOut,
  sendToAnotherQueue,
  getDesiredJobs,
  ComposeUrl,
  RateLimitError,
  TimeoutError,
  NEW_ENVIRONMENT_DUE_TO_CRASH_PARAMS_TYPES,
  NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES,
};
