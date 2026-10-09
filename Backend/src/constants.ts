import path from "node:path";

export const MONGO_DB_NAME = "BhaiDekhLe";

export const NAUKRI_BASE_URL = "https://www.naukri.com";

export const JOB_SEARCH_URL = {
  path: "react-jobs",
  query: {
    k: "react",
    nignbevent_src: "jobsearchDeskGNB",
    sort:"f",
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

export const PERSONAL_DETAILS_PATH = path.resolve(
  process.cwd(),
  "data/personalDetails.personal.json",
);

// Authentication and Account Creation Selectors
export const AUTH_SELECTORS = {
  usernameField: "#usernameField",
  passwordField: "#passwordField",
  loginSubmit: "button[type='submit']",

  // Scope: Account Creation / Registration Selectors (for future registration workflow)
  registerButton: "a[href*='register'], .register-btn",
  nameField: "#name",
  emailField: "#email",
  mobileField: "#mobile",
  registerSubmit: "button[type='submit']",
} as const;