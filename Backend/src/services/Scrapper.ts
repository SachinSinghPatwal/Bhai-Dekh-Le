import { chromium, type Request } from "playwright";
import { sanitizeCaptureHeaderUrl } from "../helpers/Playwright/sanitizeCaptureHeaderUrl.js";
import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { ApiError } from "../utility/ApiError.js";
import UrlForPageToDirect from "../utility/playwright/ComposeUrl.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";

export default async function Scraper(): Promise<JOB_DETAILS[] | undefined> {
  const browser = await chromium.launch({
    headless: false,
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Promise resolves only when the desired API request appears.
    const capturedRequest = new Promise<Request>((resolve) => {
      const handleRequest = (request: Request) => {
        if (!request.url().includes("/jobapi/v3/search")) {
          return;
        }

        // We only need the first matching request.
        page.off("request", handleRequest);

        resolve(request);
      };

      page.on("request", handleRequest);
    });

    await page.goto(UrlForPageToDirect(), {
      waitUntil: "domcontentloaded",
    });

    // Wait for the actual API request instead of sleeping for 10 seconds.
    const request = await capturedRequest;

    const url = new URL(request.url());

    const capturedHeaders = await request.allHeaders();

    const headers = sanitizeCaptureHeaderUrl(capturedHeaders);

    // Browser is only used for session/request discovery.
    // Pagination happens completely through HTTP.
    const collectedData = await makeHttpRequestToGetAllDesiredJobs({
      url,
      headers,
      request,
    });

    await context.close();
    await browser.close();

    return collectedData;
  } catch (error) {
    console.error("Scraper error:", error);
    await browser.close();

    throw new ApiError(
      500,
      "Something Went Wrong while Collecting/Scrapping Job data",
    );
  }
}
