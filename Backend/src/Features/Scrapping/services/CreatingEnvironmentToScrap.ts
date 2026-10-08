import { Browser, BrowserContext, Page, Request, Response } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { sanitizeCaptureHeaderUrl } from "../helpers/sanitizeCaptureHeaderUrl.js";
import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import eventCapturing from "../utility/playwright/CapturingEvents.js";
import RaceForResponseOrTimeOut from "../utility/playwright/RaceForResponseOrTimeOut.js";
import { TimeoutError } from "../../../utility/TimeOutError.js";
import fs from "node:fs/promises";
import { decrypt } from "../../../utility/crypto/decryption.js";
import { CLIENT_DATA_PATH } from "../../../constants.js";

chromium.use(stealth());

export interface SETUP_RETURNED_VALUES {
  url: URL;
  request: string;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
  totalJobsAvailable: number;
}
export interface SETUP_ENVIRONMENT_PARAMS {
  navigateTo: string;
  headless: boolean;
  browserShutdownStatus: "keepAlive" | "kill";
  useStorageState?: boolean;
}

export async function CreatingEnvironmentToScrap({
  navigateTo,
  headless,
  browserShutdownStatus,
  useStorageState = false,
}: SETUP_ENVIRONMENT_PARAMS): Promise<
  | Partial<SETUP_RETURNED_VALUES>
  | undefined
  | { page: Page; capturedResponse: Promise<Response>; context: BrowserContext }
> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  let state: any = undefined;
  if (useStorageState) {
    try {
      await fs.access(CLIENT_DATA_PATH);
      state = await decrypt(CLIENT_DATA_PATH);
    } catch {
      // client.encrypt.json does not exist or failed to decrypt; proceed without stored session
    }
  }

  try {
    browser = await chromium.launch({
      headless,
      args:
        browserShutdownStatus == "kill"
          ? ["--no-sandbox", "--start-minimized"]
          : ["--no-sandbox"],
      // proxy: {
      //   server: PROXIES[0],
      // },
    });

    context = await browser.newContext(
      state ? { storageState: state } : undefined,
    );

    const page = await context.newPage();

    const capturedRequest = eventCapturing<Request>(page, "request");
    const capturedResponse = eventCapturing<Response>(page, "response");

    await page.goto(navigateTo, {
      waitUntil: "domcontentloaded",
    });

    /**
     * Lightweight browser setup for DOM-based scraping flows.
     *
     * Unlike {@link CreatingEnvironmentToScrap}, this function does **not** set up
     * HTTP request/response interceptors. The HTTP flow expects a specific JSON API
     * response that is never emitted on pages like the login page — calling the
     * full setup there would always timeout or capture the wrong request.
     *
     * Returns only the Playwright {@link Page} so the caller can drive the browser
     * directly (e.g. fill login form, click buttons, navigate between pages).
     * The browser is kept alive; the caller is responsible for closing it when done.
     *
     * @param navigateTo - Full URL to navigate to on launch.
     * @param headless   - Whether to run headless.
     */

    if (!headless && browserShutdownStatus == "keepAlive") {
      return { page, capturedResponse, context };
    }

    const request = await RaceForResponseOrTimeOut<Request>(capturedRequest);

    const response = await RaceForResponseOrTimeOut<Response>(capturedResponse);

    if (request instanceof TimeoutError || response instanceof TimeoutError) {
      throw new Error("Request or Response timed out");
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
    /**
     * @description prevent zombie chrome browser if stealth mode is enabled
     *
     */
    if (browser) await browser.close();
    if (error instanceof Error) {
      console.log(error);
      throw new Error(
        "Something Went Wrong While Creating the Environment to Scrap",
        error,
      );
    }
  }
}
