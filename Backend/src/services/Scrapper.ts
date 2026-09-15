import {
  chromium,
  type Browser,
  type BrowserContext,
  type Request,
  type Response,
} from "playwright";

import { sanitizeCaptureHeaderUrl } from "../helpers/Playwright/sanitizeCaptureHeaderUrl.js";
import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { ApiError } from "../utility/ApiError.js";
import UrlForPageToDirect from "../utility/playwright/ComposeUrl.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { interceptingBrowsersHttpCommunication } from "../helpers/Playwright/interceptingBrowsersHttpCommunication.js";

export default async function Scraper(
  workerId: string,
): Promise<JOB_DETAILS[] | undefined> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({
      headless: false,
    });

    context = await browser.newContext();

    const page = await context.newPage();

    const capturedRequest = new Promise<Request>((resolve) => {
      page.on(
        "request",
        interceptingBrowsersHttpCommunication(page, resolve, "request"),
      );
    });

    const capturedResponse = new Promise<Response>((resolve) => {
      page.on(
        "response",
        interceptingBrowsersHttpCommunication(page, resolve, "response"),
      );
    });

    await page.goto(UrlForPageToDirect(), {
      waitUntil: "domcontentloaded",
    });

    const request = await capturedRequest;
    const response = await capturedResponse;

    const url = new URL(request.url());

    const capturedHeaders = await request.allHeaders();

    const headers = sanitizeCaptureHeaderUrl(capturedHeaders);

    const { jobDetails, noOfJobs } = await response.json();

    const filteredRecentJob = await makeHttpRequestToGetAllDesiredJobs({
      url,
      headers,
      request,
      noOfJobs,
      workerId,
      jobDetails,
    });

    return filteredRecentJob;
  } catch (error: unknown) {
    console.error(`Worker ${workerId}: Scraper error:`, error);
    if (error instanceof Error) {
      throw new ApiError(
        500,
        "Something Went Wrong while Collecting/Scrapping Job data",
        error.message,
      );
    }
    throw error;
  } finally {
    await browser?.close();
  }
}
