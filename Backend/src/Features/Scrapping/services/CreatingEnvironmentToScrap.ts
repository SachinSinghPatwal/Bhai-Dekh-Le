import { Browser, BrowserContext, Request, Response } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { sanitizeCaptureHeaderUrl } from "../helpers/sanitizeCaptureHeaderUrl.js";
import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import eventCapturing from "../utility/playwright/CapturingEvents.js";
import RaceForResponseOrTimeOut from "../utility/playwright/RaceForResponseOrTimeOut.js";
import { TimeoutError } from "../../../utility/TimeOutError.js";
import { decrypt } from "../../../utility/crypto/decryption.js";
import { CLIENT_DATA_PATH } from "../../../constants.js";
import { existsSync } from "node:fs";
import loginToNaukri from "./naukri/naukriAuth/Login.js";
import log from "../../../utility/Logger.js";

chromium.use(stealth());

export interface SETUP_VALUES {
  url: URL;
  request: string;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
  totalJobsAvailable: number;
}

export type SETUP_RETURNED_VALUES = SETUP_VALUES;

/**
 * Creates and initializes the scraping environment:
 * 1. Checks and loads encrypted session state if available.
 * 2. Launches browser and creates context.
 * 3. Executes `loginToNaukri` (which checks data, navigates to login first if needed,
 *    and handles login/account-creation scope before the search path).
 * 4. Navigates to the intended destination URL (`navigateTo`).
 * 5. Intercepts HTTP network communications to retrieve API headers, request, and job data.
 *
 * @param navigateTo - The target search/job listing URL to navigate to
 * @param workerId   - The worker ID running this scrape environment
 */
export async function CreatingEnvironmentToScrap(
  navigateTo: string,
  workerId: string = "scraper-worker",
): Promise<SETUP_VALUES> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let state: any = undefined;

  try {
    // 1. Check if encrypted auth state exists on disk
    if (existsSync(CLIENT_DATA_PATH)) {
      try {
        state = await decrypt(CLIENT_DATA_PATH);
        log.info(`[${workerId}] Loaded decrypted session state from disk.`);
      } catch (decryptErr) {
        log.warn(
          `[${workerId}] Failed to decrypt session state, will re-authenticate: ${decryptErr}`,
        );
        state = undefined;
      }
    }

    // 2. Launch browser with stealth
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--start-minimized"],
    });

    // 3. Create context (attaching storageState if authenticated session is present)
    context = await browser.newContext(
      state ? { storageState: state } : undefined,
    );

    const page = await context.newPage();

    // 4. Authenticate: loginToNaukri checks data, goes to login first if needed,
    //    and leaves account creation scope ready.
    await loginToNaukri(page, context, workerId);

    // 5. Setup event capturing for HTTP API interception before navigation
    const capturedRequest = eventCapturing<Request>(page, "request");
    const capturedResponse = eventCapturing<Response>(page, "response");

    // 6. Navigate to the intended path requested by caller
    log.info(`[${workerId}] Navigating to intended path: ${navigateTo}`);
    await page.goto(navigateTo, {
      waitUntil: "domcontentloaded",
    });

    // 7. Await intercepted search API request and response
    const request = await RaceForResponseOrTimeOut<Request>(
      capturedRequest as Promise<Request>,
    );

    const response = await RaceForResponseOrTimeOut<Response>(capturedResponse);

    if (request instanceof TimeoutError || response instanceof TimeoutError) {
      throw new Error("Request or Response timed out while intercepting search API");
    }

    const url = new URL(request.url());
    const capturedHeaders = await request.allHeaders();
    const headers = sanitizeCaptureHeaderUrl(capturedHeaders);

    const jsonData = await response.json();
    const jobDetails = jsonData.jobDetails;
    const totalJobsAvailable = jsonData.noOfJobs;
    const method = request.method();

    await browser.close();
    browser = null;

    return {
      url,
      request: method,
      totalJobsAvailable,
      headers,
      jobDetails,
    };
  } catch (error: unknown) {
    if (browser) {
      await browser.close();
      browser = null;
    }
    throw new Error(
      "Something Went Wrong While Creating the Environment to Scrap",
      { cause: error },
    );
  }
}
