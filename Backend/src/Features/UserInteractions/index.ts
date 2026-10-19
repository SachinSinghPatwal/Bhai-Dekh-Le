import Logger from "../../utility/Logger.js";
import { PERSONAL_DETAILS_PATH } from "../../constants.js";

const log = Logger;

export {
  ensureBasicUserInformation,
  isDevelopmentMode,
  getDefaultUserProfile,
  type UserResumeProfile,
} from "./utility/basicUserInformation.js";

export { Logger, log, PERSONAL_DETAILS_PATH };
