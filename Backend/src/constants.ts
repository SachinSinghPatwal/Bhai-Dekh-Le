import path from "node:path";

export const MONGO_DB_NAME = "BhaiDekhLe";

export const NAUKRI_BASE_URL = "https://www.naukri.com";

export const JOB_SEARCH_URL = {
  path: "react-jobs",
  query: {
    k: "react",
    nignbevent_src: "jobsearchDeskGNB",
    sort: "f",
  },
};

export const JOB_AUTH_URL = {
  loginPath: "nlogin/login",
  signUpPath: "registration/createAccount",
};

// RabbitMQ Constants
export const ScheduleScrape = "TimedScrapping";
export const dbSaveExchange = "db_save_exchange";
export const dbSave = "db_save";
export const jdScrapeExchange = "jd_scrape_exchange";
export const jdScrape = "jd_scrape";

// URL Constants
export const MatchedURLOfSearch = "/jobapi/v3/search";

// Misc Constants
export const SNAPSHOT_FOLDER_NAME = "snapShots";
export const CLIENT_DATA_FOLDER_NAME = "src/Features/Scrapping/data";

// proxies
export const PROXIES = ["http://62.72.43.79:3129"];

// General TimeOut
export const GENERAL_TIMEOUT = 2000; // 2 seconds

export const INTERACTION_DELAYS = {
  typingDelay: Number(process.env.INTERACTION_TYPING_DELAY ?? 0),
  postTypeDelay: Number(process.env.INTERACTION_POST_TYPE_DELAY ?? 0),
  clickDelay: Number(process.env.INTERACTION_CLICK_DELAY ?? 0),
} as const;

// path
export const CLIENT_DATA_PATH = path.resolve(
  process.cwd(),
  "src/Features/Scrapping/data/client.encrypted.json",
);

export const PERSONAL_DETAILS_PATH = path.resolve(
  process.cwd(),
  "data/personalDetails.personal.json",
);

export const USER_DETAILS_PATH = path.resolve(
  process.cwd(),
  "data/userDetails.personal.json",
);

// Authentication and Account Creation Selectors
export const AUTH_SELECTORS = {
  signedUserField:
    "#usernameField, #signedUserField, input[placeholder*='Username'], input[placeholder*='Email']",
  signedPasswordField:
    "#passwordField, #signedPasswordField, input[type='password']",
  loginSubmit: "button[type='submit']",

  // Scope: Account Creation / Registration Selectors (for future registration workflow)
  nameField: "#name",
  emailField: "#email",
  passwordField: "#password",
  mobileField: "#mobile",
  refillMobileField: "#mobile-number",
  userType: "div[data-val='exp']",
  editPhoneNumber: "img[role='button']",
  sendOTP: ".verify",
  skip: "span[role='button']",
} as const;
