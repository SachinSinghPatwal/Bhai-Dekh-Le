import {
  CustomBrailleDotBar,
  startSpinningLoader,
} from "./TerminalProgress.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMock() {
  console.log("\n--- Scenario 1: Spinning Loader with Worker Logs Above It ---");
  const initSpinner = startSpinningLoader("Initializing workers and queue listeners...");
  await sleep(600);
  console.log("\r\x1b[2K[worker-1] RabbitMQ consumer channel bound to timed queue");
  await sleep(600);
  console.log("\r\x1b[2K[worker-2] RabbitMQ consumer channel bound to timed queue");
  await sleep(600);
  initSpinner.stop("All Scrap and DB workers initialized and listening to queues.");

  console.log("\n--- Scenario 2: Site Scrape with Random Constellation & Early Stop Snap ---");
  const totalSitePages = 600;
  const earlyStopPage = 65;
  const siteSession = "mock-naukri";
  let tick = 0;

  for (let page = 1; page <= earlyStopPage; page += 2) {
    CustomBrailleDotBar(
      page,
      earlyStopPage,
      "[worker-1] naukri",
      28,
      tick++,
      siteSession,
    );
    await sleep(75);
  }

  CustomBrailleDotBar(
    earlyStopPage,
    earlyStopPage,
    "[worker-1] naukri",
    28,
    tick++,
    siteSession,
  );
  console.log("\r\x1b[2K[worker-1] Reached end of fresh jobs at page 65. Returning 130 jobs to DB queue.");

  console.log("\n--- Scenario 3: JD Scraping (0 to End, No Early Snap) ---");
  const totalJds = 30;
  const jdSession = "mock-jd";

  for (let jd = 1; jd <= totalJds; jd++) {
    CustomBrailleDotBar(
      jd,
      totalJds,
      "[worker-1] Scraping JDs",
      28,
      tick++,
      jdSession,
    );
    await sleep(60);
  }

  console.log("\n--- Scenario 4: GenAI Spinning Loader ---");
  const aiSpinner = startSpinningLoader("[worker-1] Evaluating candidate resume with Gemini AI...");
  await sleep(2000);
  aiSpinner.stop("Gemini AI resume evaluation completed successfully.");

  console.log("\n--- Scenario 5: Error Handling with Red Dot on Bar and Reason Below ---");
  const errorSession = "mock-error";
  for (let p = 1; p <= 18; p += 2) {
    CustomBrailleDotBar(
      p,
      50,
      "[worker-2] jobFound",
      28,
      tick++,
      errorSession,
    );
    await sleep(60);
  }

  CustomBrailleDotBar(
    18,
    50,
    "[worker-2] jobFound",
    28,
    tick++,
    errorSession,
    true,
    "HTTP 429 Too Many Requests: Rate limit exceeded at page 18.",
  );

  console.log("\nAll mock demonstrations finished.\n");
}

void runMock();
