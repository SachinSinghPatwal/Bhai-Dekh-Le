import { Browser, BrowserContext, Page, Request, Response } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { sanitizeCaptureHeaderUrl } from "../helpers/sanitizeCaptureHeaderUrl.js";
import type { JOB_DETAILS } from "../../../types.js";
import CapturingEvents from "../utility/playwright/CapturingEvents.js";
import RaceForResponseOrTimeOut from "../utility/playwright/RaceForResponseOrTimeOut.js";
import { TimeoutError as TimeOutError } from "../../../utility/TimeOutError.js";
import { decrypt as decryption } from "../../../utility/crypto/decryption.js";
import { CLIENT_DATA_PATH } from "../../../constants.js";
import Login from "./naukri/naukriAuth/Login.js";
import Logger from "../../../utility/Logger.js";
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

export async function createScrapingSession(
  workerId: string = "scraper-worker",
): Promise<ScrapingSession> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let state: any = undefined;

  try {
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

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--start-minimized"],
    });

    context = await browser.newContext(
      state ? { storageState: state } : undefined,
    );

    const page = await context.newPage();

    await Login(page, context, workerId);

    return { browser, context, page };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw error;
  }
}

export async function CreatingEnvironmentToScrap(
  navigateTo: string,
  workerId: string = "scraper-worker",
): Promise<SETUP_VALUES> {
  const { browser, page } = await createScrapingSession(workerId);

  try {
    const capturedRequest = CapturingEvents<Request>(page, "request");
    const capturedResponse = CapturingEvents<Response>(page, "response");

    await page.goto(navigateTo, {
      waitUntil: "domcontentloaded",
    });

    const request = await RaceForResponseOrTimeOut<Request>(
      capturedRequest,
      "Request Event took longer than the timeout",
    );

    const response = await RaceForResponseOrTimeOut<Response>(
      capturedResponse,
      "Response Event took longer than the timeout",
    );

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
