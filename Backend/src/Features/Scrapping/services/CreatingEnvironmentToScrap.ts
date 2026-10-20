import { Browser, BrowserContext, Page, Request, Response } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { sanitizeCaptureHeaderUrl } from "../helpers/sanitizeCaptureHeaderUrl.js";
import {
  JOB_DETAILS,
  CapturingEvents,
  RaceForResponseOrTimeOut,
  TimeOutError,
  decryption,
  CLIENT_DATA_PATH,
  Login,
  Logger,
} from "../index.js";
import { existsSync } from "node:fs";

chromium.use(stealth());

export interface SETUP_VALUES {
  url: URL;
  request: string;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
  totalJobsAvailable: number;
}

export type SETUP_RETURNED_VALUES = SETUP_VALUES;

export interface ScrapingSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Abstract environment initializer for Playwright scraping.
 * 1. Checks and loads encrypted session state if available.
 * 2. Launches browser with stealth plugins.
 * 3. Creates browser context with storage state if present.
 * 4. Ensures authenticated session via Login.
 *
 * @param workerId - The worker ID running this session
 */
export async function createScrapingSession(
  workerId: string = "scraper-worker",
): Promise<ScrapingSession> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let state: any = undefined;

  try {
    // 1. Check if encrypted auth state exists on disk
    if (existsSync(CLIENT_DATA_PATH)) {
      try {
        state = await decryption(CLIENT_DATA_PATH);
        Logger.info(`[${workerId}] Loaded decrypted session state from disk.`);
      } catch (decryptErr) {
        Logger.warn(
          `[${workerId}] Failed to decrypt session state, will re-authenticate: ${decryptErr}`,
        );
        state = undefined;
      }
    }

    // 2. Launch browser with stealth
    browser = await chromium.launch({
      headless: false,
      args: [
        // "--no-sandbox", 
        // "--start-minimized"
      ],
    });

    // 3. Create context (attaching storageState if authenticated session is present)
    context = await browser.newContext(
      state ? { storageState: state } : undefined,
    );

    const page = await context.newPage();

    // 4. Authenticate: Login checks data, goes to login first if needed
    await Login(page, context, workerId);

    return { browser, context, page };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw error;
  }
}

/**
 * Creates and initializes the scraping environment:
 * 1. Calls abstract `createScrapingSession` to initialize browser and session.
 * 2. Navigates to the intended destination URL (`navigateTo`).
 * 3. Intercepts HTTP network communications to retrieve API headers, request, and job data.
 *
 * @param navigateTo - The target search/job listing URL to navigate to
 * @param workerId   - The worker ID running this scrape environment
 */
export async function CreatingEnvironmentToScrap(
  navigateTo: string,
  workerId: string = "scraper-worker",
): Promise<SETUP_VALUES> {
  const { browser, page } = await createScrapingSession(workerId);

  try {
    // Setup event capturing for HTTP API interception before navigation
    const capturedRequest = CapturingEvents<Request>(page, "request");
    const capturedResponse = CapturingEvents<Response>(page, "response");

    // Navigate to the intended path requested by caller
    await page.goto(navigateTo, {
      waitUntil: "domcontentloaded",
    });

    // Await intercepted search API request and response
    const request = await RaceForResponseOrTimeOut<Request>(
      capturedRequest as Promise<Request>,
    );

    const response = await RaceForResponseOrTimeOut<Response>(capturedResponse);

    if (request instanceof TimeOutError || response instanceof TimeOutError) {
      throw new Error(
        "Request or Response timed out while intercepting search API",
      );
    }

    const url = new URL(request.url());
    const capturedHeaders = await request.allHeaders();
    const headers = sanitizeCaptureHeaderUrl(capturedHeaders);

    const jsonData = await response.json();
    const jobDetails = jsonData.jobDetails;
    const totalJobsAvailable = jsonData.noOfJobs;
    const method = request.method();

    await browser.close();

    return {
      url,
      request: method,
      totalJobsAvailable,
      headers,
      jobDetails,
    };
  } catch (error: unknown) {
    await browser.close().catch(() => {});
    throw error;
  }
}

export default CreatingEnvironmentToScrap;
