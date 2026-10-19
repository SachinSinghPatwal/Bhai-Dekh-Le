import type { JOB_DETAILS } from "../../models/Mongo/job.models.js";
import { JobModel } from "../../models/Mongo/job.models.js";
import Logger from "../../utility/Logger.js";
import {
  PROXIES,
  JOB_AUTH_URL,
  dbSaveExchange,
  JOB_SEARCH_URL,
  AUTH_SELECTORS,
  NAUKRI_BASE_URL,
  CLIENT_DATA_FOLDER_NAME,
  CLIENT_DATA_PATH,
  GENERAL_TIMEOUT,
  MatchedURLOfSearch,
} from "../../constants.js";
import { getFileFolderNamingConvention as SnapShotsFileNamingConvention } from "../../helper/SnapShotsFileNamingConvention.js";
import RaceForResponseOrTimeOut from "./utility/playwright/RaceForResponseOrTimeOut.js";
import { TimeoutError as TimeOutError } from "../../utility/TimeOutError.js";
import TimeOut from "../../utility/TimeOut.js";
import { encrypt as encryption } from "../../utility/crypto/encryption.js";
import { decrypt as decryption } from "../../utility/crypto/decryption.js";
import SaveSnapShots from "../../helper/SaveSnapShots.js";
import { getAllSnapshotJobs as getAllSnapShots } from "../../helper/getAllSnapShots.js";
import { getUserDataFromFile as userDataHelper } from "../../helper/userDataHelper.js";
import { retrieveUserResumeLink } from "../../middlewares/job.middleware.js";
import DistributingWork from "../MessageQueues/helpers/DistributingWork.js";
import TransferingWorkToNextQueue from "../MessageQueues/helpers/TransferingWorkToNextQueue.js";
import { fetchCloudinaryPdf as Cloudinary } from "../AI/services/Cloudinary.js";

import {
  RequestParams,
  NEW_ENVIRONMENT_DUE_TO_CRASH_PARAMS_TYPES,
  NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES,
} from "../../types.js";

import { RateLimitError as RateLimitingError } from "./utility/playwright/RateLimitingError.js";
import GetDesiredJobs from "./services/GetDesiredJobs.js";
import ComposeUrl from "./utility/ComposeUrl.js";
import Fetch from "./utility/Fetch.js";
import sortingJobBasedOnCreated from "./utility/sortingJobBasedOnCreated.js";
import CapturingEvents from "./utility/playwright/CapturingEvents.js";
import responseValidation from "./utility/playwright/responseValidation.js";
import StoreState from "./utility/playwright/StoreState.js";
import ValidatingProp from "./utility/playwright/ValidatingProp.js";
import {
  waitForPageReady,
  clickButton,
  typeIntoField,
} from "./utility/playwright/interactions/index.js";
import CreatingEnvironmentToScrap, {
  createScrapingSession,
} from "./services/CreatingEnvironmentToScrap.js";
import PlatformInitialization from "./services/PlatformInitialization.js";
import HttpBasedScrap from "./services/naukri/HttpBasedScrap.js";
import naukriJDScrap from "./services/naukri/naukriJDScrap.js";
import Login from "./services/naukri/naukriAuth/Login.js";
import { interceptingBrowsersHttpCommunication } from "./helpers/interceptingBrowsersHttpCommunication.js";
import { sanitizeCaptureHeaderUrl } from "./helpers/sanitizeCaptureHeaderUrl.js";
import SaveUserData from "./helpers/SaveUserData.js";
import ScrappingPaginatedJob from "./helpers/ScrappingPaginatedJob.js";
import { setIterativePaginationParams } from "./helpers/setIterativePaginationParams.js";
import bodyValidation from "./helpers/naukri/bodyValidation.js";

// Aliases for compatibility
const log = Logger;
const TimeoutError = TimeOutError;
const RateLimitError = RateLimitingError;
const sendToAnotherQueue = TransferingWorkToNextQueue;
const getDesiredJobs = GetDesiredJobs;
const getFileFolderNamingConvention = SnapShotsFileNamingConvention;
const saveSnapShots = SaveSnapShots;
const getAllSnapshotJobs = getAllSnapShots;
const getUserDataFromFile = userDataHelper;
const DistributingLoadWithWorkers = DistributingWork;
const fetchCloudinaryPdf = Cloudinary;
const GetAllJobs = Fetch;
const sortingUnsortedJobBasedOnTimeCreated = sortingJobBasedOnCreated;
const eventCapturing = CapturingEvents;
const ResponseValidation = responseValidation;
const StoreSessionState = StoreState;
const ValidateJobIsPostedWithinSetDays = ValidatingProp;
const loginToNaukri = Login;
const httpScrapping = HttpBasedScrap;
const encrypt = encryption;
const decrypt = decryption;

export {
  type JOB_DETAILS,
  type RequestParams,
  type NEW_ENVIRONMENT_DUE_TO_CRASH_PARAMS_TYPES,
  type NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES,

  Logger,
  log,
  TimeOutError,
  TimeoutError,
  TimeOut,
  encryption,
  encrypt,
  decryption,
  decrypt,
  SnapShotsFileNamingConvention,
  getFileFolderNamingConvention,
  SaveSnapShots,
  saveSnapShots,
  getAllSnapShots,
  getAllSnapshotJobs,
  userDataHelper,
  getUserDataFromFile,
  JobModel,
  retrieveUserResumeLink,
  DistributingWork,
  DistributingLoadWithWorkers,
  TransferingWorkToNextQueue,
  sendToAnotherQueue,
  Cloudinary,
  fetchCloudinaryPdf,

  PROXIES,
  JOB_AUTH_URL,
  dbSaveExchange,
  JOB_SEARCH_URL,
  AUTH_SELECTORS,
  NAUKRI_BASE_URL,
  CLIENT_DATA_FOLDER_NAME,
  CLIENT_DATA_PATH,
  GENERAL_TIMEOUT,
  MatchedURLOfSearch,

  RateLimitingError,
  RateLimitError,
  RaceForResponseOrTimeOut,
  CapturingEvents,
  eventCapturing,
  responseValidation,
  ResponseValidation,
  StoreState,
  StoreSessionState,
  ValidatingProp,
  ValidateJobIsPostedWithinSetDays,
  waitForPageReady,
  clickButton,
  typeIntoField,
  ComposeUrl,
  Fetch,
  GetAllJobs,
  sortingJobBasedOnCreated,
  sortingUnsortedJobBasedOnTimeCreated,
  GetDesiredJobs,
  getDesiredJobs,
  CreatingEnvironmentToScrap,
  createScrapingSession,
  PlatformInitialization,
  HttpBasedScrap,
  httpScrapping,
  naukriJDScrap,
  Login,
  loginToNaukri,
  interceptingBrowsersHttpCommunication,
  sanitizeCaptureHeaderUrl,
  SaveUserData,
  ScrappingPaginatedJob,
  setIterativePaginationParams,
  bodyValidation,
};
