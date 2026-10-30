import path from "node:path";

export const MONGO_DB_NAME = "BhaiDekhLe";

export const NAUKRI_BASE_URL = "https://www.naukri.com";
export const JOB_FOUND_BASE_URL = "https://jobfound.org";

export const JOB_SEARCH_URL = {
  path: "react-jobs",
  query: {
    k: "react",
    nignbevent_src: "jobsearchDeskGNB",
    sort: "f",
  },
};

export const JOB_FOUND_SEARCH_URL = {
  path: "api/job/search",
  query: {
    q: "Frontend Engineer",
    page: 1,
    limit: 45,
    sort: "newest",
    experience: "0-1+yr",
    country: "India,Remote",
    postedWithin: 1,
  },
};

export const JOB_AUTH_URL = {
  loginPath: "nlogin/login",
  signUpPath: "registration/createAccount",
};

export const SCRAPING_PLATFORMS: string[] = ["naukri"];

export const ScheduleScrape = "TimedScrapping";
export const scrapeDlx = "timed_scrapping_dlx";
export const scrapeDlq = "timed_scrapping_dlq";
export const scrapeDlqRoutingKey = "ScrapeDeadLetter";

export const dbSaveExchange = "db_save_exchange";
export const dbSave = "db_save";
export const dbSaveDlx = "db_save_dlx";
export const dbSaveDlq = "db_save_dlq";
export const dbSaveDlqRoutingKey = "DbSaveDeadLetter";

export const jdScrapeExchange = "jd_scrape_exchange";
export const jdScrape = "jd_scrape";

export const QUEUE_MESSAGE_TTL_MS = 600000;

export const aiEvaluationExchange = "ai_evaluation_exchange";
export const aiEvaluationQueue = "ai_evaluation";
export const aiEvaluationDlx = "ai_evaluation_dlx";
export const aiEvaluationDlq = "ai_evaluation_dlq";
export const aiEvaluationRoutingKey = "Evaluate";
export const aiEvaluationDlqRoutingKey = "AiEvaluationDeadLetter";

export const MatchedURLOfSearch = "/jobapi/v3/search";

export const SNAPSHOT_FOLDER_NAME = "snapShots";
export const NAUKRI_SNAPSHOT_FOLDER = path.join(SNAPSHOT_FOLDER_NAME, "naukri");
export const JOB_FOUND_SNAPSHOT_FOLDER = path.join(SNAPSHOT_FOLDER_NAME, "jobFound");
export const CLIENT_DATA_FOLDER_NAME = "src/Features/Scrapping/data";

export const PROXIES = ["http://62.72.43.79:3129"];

export const GENERAL_TIMEOUT = 1000; 

export const SCRAPING_JITTER = {
  breatherIntervalPages: 100,
  jdScrapBaseDelay: 0, 
  jdScrapMaxJitter: 0,
} as const;

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

export const AUTH_SELECTORS = {
  signedUserField:
    "#usernameField, #signedUserField, input[placeholder*='Username'], input[placeholder*='Email']",
  signedPasswordField:
    "#passwordField, #signedPasswordField, input[type='password']",
  loginSubmit: "button[type='submit']",
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
