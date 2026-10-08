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

export interface HTTP_SETUP_VALUES {
  url: URL;
  request: string;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
  totalJobsAvailable: number;
}

export interface DOM_SETUP_VALUES {
  page: Page;
  capturedResponse: Promise<Response>;
  context: BrowserContext;
}

type ENVIRONMENT_RETURNED_VALUES = HTTP_SETUP_VALUES | DOM_SETUP_VALUES;

export interface ENVIRONMENT_SETUP_PARAMS {
  navigateTo: string;
  headless: boolean;
  browserShutdownStatus: "keepAlive" | "kill";
  useStorageState?: boolean;
  mode: "DOM" | "HTTP";
}

export async function CreatingEnvironmentToScrap({
  navigateTo,
  headless,
  browserShutdownStatus,
  useStorageState = false, // soon depricate !
  mode,
}: ENVIRONMENT_SETUP_PARAMS): Promise<ENVIRONMENT_RETURNED_VALUES | Error> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let capturedRequest;

  let state: any = undefined;
  if (useStorageState) {
    try {
      await fs.access(CLIENT_DATA_PATH);
      state = await decrypt(CLIENT_DATA_PATH);
    } catch(error) {
      throw error
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

    if (mode === "HTTP") {
      capturedRequest = eventCapturing<Request>(page, "request");
    }

    const capturedResponse = eventCapturing<Response>(page, "response");

    await page.goto(navigateTo, {
      waitUntil: "domcontentloaded",
    });

    if (!headless && browserShutdownStatus == "keepAlive") {
      return { page, capturedResponse, context };
    }

    const request = await RaceForResponseOrTimeOut<Request>(
      capturedRequest as Promise<Request>,
    );

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
     */
    if (browser) await browser.close();
    throw new Error(
      "Something Went Wrong While Creating the Environment to Scrap",
      error as ErrorOptions,
    );
  }
}

export async function interceptingTrafficAndExtractingValues(
  page: Page,
  browser: Browser,
) {
  // if (!headless && browserShutdownStatus == "keepAlive") {
  //   return { page, capturedResponse, context };
  // }
  try {
    const capturedRequest = eventCapturing<Request>(page, "request");
    const capturedResponse = eventCapturing<Response>(page, "response");

    const request = await RaceForResponseOrTimeOut<Request>(
      capturedRequest as Promise<Request>,
    );

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
      page,
    };
  } catch (error) {
    throw new Error("Semething went wrong while intercepting signal");
  }
}
