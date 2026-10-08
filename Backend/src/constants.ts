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

// selectores DONT CHANGE
export const SELECTORS = {
  searchExpand:
    ".nI-gNb-sb__expand, .nI-gNb-sb__placeholder, #ni-gnb-searchbar, .nI-gNb-sb__main",
  suggestorInput: ".suggestor-input",
  searchSubmit: ".nI-gNb-sb__icon-wrapper, button[aria-label='Search']",
  sortButton:
    "#filter-sort, .styles_sort-droop-label__TxC3K, .styles_ss__menu-btn__4s9fF",
  sortMenu:
    "ul[data-filter-id='sort'], .styles_sort-droop-list__BmFFW, .styles_ss__menu_9TuCu",
  dateSortOption:
    "li.styles_ss__menu-item__T4rgB[title='Date'], a[data-id='filter-sort-f'], li[title='Date']",
} as const;