import Logger from "../../utility/Logger.js";
import { User } from "../../models/Mongo/user.models.js";
import { retrieveUserResumeLink } from "../../middlewares/job.middleware.js";
import { getUserDataFromFile as userDataHelper } from "../../helper/userDataHelper.js";
import Cloudinary, { fetchCloudinaryPdf } from "./services/Cloudinary.js";

const log = Logger;
const getUserDataFromFile = userDataHelper;

export {
  Logger,
  log,
  User,
  retrieveUserResumeLink,
  userDataHelper,
  getUserDataFromFile,

  Cloudinary,
  fetchCloudinaryPdf,
};
