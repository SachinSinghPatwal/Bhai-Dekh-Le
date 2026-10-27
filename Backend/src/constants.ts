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
export const NAUKRI_SNAPSHOT_FOLDER = path.join(SNAPSHOT_FOLDER_NAME, "naukri");
export const JOB_FOUND_SNAPSHOT_FOLDER = path.join(SNAPSHOT_FOLDER_NAME, "jobFound");
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

// Jitter & Delay Configuration for Scraping (controllable via constants or ENV variables)
export const SCRAPING_JITTER = {
  // Delay between pagination requests in ScrappingPaginatedJob (ms)
  paginationBaseDelay: Number(
    process.env.SCRAPING_PAGINATION_BASE_DELAY ?? 1000,
  ), // reduced from 3000-4000ms
  paginationMaxJitter: Number(
    process.env.SCRAPING_PAGINATION_MAX_JITTER ?? 1000,
  ), // reduced from 2500ms

  // Periodic breather interval and duration in ScrappingPaginatedJob (ms)
  breatherIntervalPages: Number(
    process.env.SCRAPING_BREATHER_INTERVAL_PAGES ?? 18,
  ),
  breatherBaseDelay: Number(process.env.SCRAPING_BREATHER_BASE_DELAY ?? 1000), // reduced from 8000ms
  breatherMaxJitter: Number(process.env.SCRAPING_BREATHER_MAX_JITTER ?? 1000), // reduced from 5000ms

  // Delay between individual JD scraping requests in naukriJDScrap (ms)
  jdScrapBaseDelay: Number(process.env.SCRAPING_JD_BASE_DELAY ?? 500), // reduced from 1500ms
  jdScrapMaxJitter: Number(process.env.SCRAPING_JD_MAX_JITTER ?? 500), // reduced from 1500ms

  // Retry base delay and jitter in Fetch (ms)
  fetchRetryBaseDelay: Number(process.env.FETCH_RETRY_BASE_DELAY ?? 1000), // reduced from 5000ms
  fetchRetryMaxJitter: Number(process.env.FETCH_RETRY_MAX_JITTER ?? 1000), // reduced from 3000ms
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
