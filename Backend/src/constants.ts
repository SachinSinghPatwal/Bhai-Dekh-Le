export const MONGO_DB_NAME = "BhaiDekhLe";

export const JOb_SEARCH_URL_WITH_QUERY = {
  protocol: "https://",
  domain: "www.naukri.com/",
  generic_Job_Description:
    "react-jobs?",
  query: {
    keyword:
      "k=react&",
    // location: "l=Bhopal&",
    // experince: "experience=1&",
    job_Search_By: "nignbevent_src=jobsearchDeskGNB&",
    // jobType: 0, naukri uses code number to predict the type
    // department: 5, functionalArealGrid prop used
    // salary: "ctcFilter=0to3",
  },
};

// RabbitMQ Constants
export const ScheduleScrape = "TimedScrapping";
export const dbSaveExchange = "db_save_exchange";
export const dbSave = "db_save";

// URL Constants
export const MatchedURLOfSearch = "/jobapi/v3/search";

// Misc Constants
export const FOLDER_NAME = "snapShots";

// proxies
export const PROXIES = ["http://62.72.43.79:3129"];

// General TimeOut 
export const GENERAL_TIMEOUT = 30000; // 30 seconds
