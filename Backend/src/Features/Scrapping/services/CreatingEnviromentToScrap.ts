import { Browser, BrowserContext, Page, Request, Response } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { sanitizeCaptureHeaderUrl } from "../helpers/sanitizeCaptureHeaderUrl.js";
import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import eventCaptured from "../utility/playwright/CapturingEvents.js";
import RaceForResponseOrTimeOut from "../utility/playwright/RaceForResponseOrTimeOut.js";
import { TimeoutError } from "../../../utility/TimeOutError.js";

chromium.use(stealth());

export interface SETUP_RETURNED_VALUES {
  url: URL;
  request: string;
  totalJobsAvailable: number;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
  page:Page;
}
export interface SETUP_ENVIRONMENT_PARAMS {
  navigateTo: string;
  headless: boolean;
}

export async function CreatingEnvironmentToScrap({ navigateTo, headless }: SETUP_ENVIRONMENT_PARAMS): Promise<
  SETUP_RETURNED_VALUES | undefined
> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  try {
    browser = await chromium.launch({
      headless,
      args: ["--no-sandbox", "--start-minimized"],
      // proxy: {
      //   server: PROXIES[0],
      // },
    });

    context = await browser.newContext();

    const page = await context.newPage();

    const { capturedRequest, capturedResponse } = eventCaptured(page);

    await page.goto(navigateTo, {
      waitUntil: "domcontentloaded",
    });

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
      page,
    };
  } catch (error: unknown) {
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
