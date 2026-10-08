import path from "node:path";

export const MONGO_DB_NAME = "BhaiDekhLe";

export const NAUKRI_BASE_URL = "https://www.naukri.com";

export const JOB_SEARCH_URL = {
  path: "react-jobs",
  query: {
    k: "react",
    nignbevent_src: "jobsearchDeskGNB",
  },
};

export const JOB_AUTH_URL = {
  path: "nlogin/login",
};

// RabbitMQ Constants
export const ScheduleScrape = "TimedScrapping";
export const dbSaveExchange = "db_save_exchange";
export const dbSave = "db_save";

// URL Constants
export const MatchedURLOfSearch = "/jobapi/v3/search";


// Misc Constants
export const SNAPSHOT_FOLDER_NAME = "snapShots";
export const CLIENT_DATA_FOLDER_NAME = "src/Features/Scrapping/data";

// proxies
export const PROXIES = ["http://62.72.43.79:3129"];

// General TimeOut
export const GENERAL_TIMEOUT = 30000; // 30 seconds

// path
export const CLIENT_DATA_PATH = path.resolve(
  process.cwd(),
  "src/Features/Scrapping/data/client.encrypted.json",
);
