import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Request,
  type Response,
} from "playwright";

import { sanitizeCaptureHeaderUrl } from "../helpers/Playwright/sanitizeCaptureHeaderUrl.js";
import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { ApiError } from "../utility/ApiError.js";
import UrlForPageToDirect from "../utility/playwright/ComposeUrl.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";

class Scraper {
  // One shared browser for all workers
  private static browser: Browser | null = null;

  // One Scraper instance per worker
  private static instances = new Map<string, Scraper>();

  // One context + one page per worker
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private constructor(private readonly workerId: string) {}

  public static async getInstance(workerId: string): Promise<Scraper> {
    // Create the browser only once
    if (!Scraper.browser) {
      Scraper.browser = await chromium.launch({
        headless: false,
      });
    }

    // Return existing worker instance
    let scraper = Scraper.instances.get(workerId);

    if (!scraper) {
      scraper = new Scraper(workerId);

      // Every worker gets its own isolated context
      scraper.context = await Scraper.browser.newContext();

      // Exactly one page for this worker
      scraper.page = await scraper.context.newPage();

      Scraper.instances.set(workerId, scraper);
    }

    return scraper;
  }

  private getPage(): Page {
    if (!this.page) {
      throw new Error(`Worker ${this.workerId}: Page is not initialized`);
    }

    return this.page;
  }

  public async scrape(): Promise<JOB_DETAILS[] | undefined> {
    const page = this.getPage();

    try {
      console.log(`Worker ${this.workerId}: starting scraper`);

      const capturedRequest = this.captureRequest(page);
      const capturedResponse = this.captureResponse(page);

      await page.goto(UrlForPageToDirect(), {
        waitUntil: "domcontentloaded",
      });

      const request = await capturedRequest;
      const response = await capturedResponse;

      const url = new URL(request.url());

      const capturedHeaders = await request.allHeaders();

      const headers = sanitizeCaptureHeaderUrl(capturedHeaders);

      const { jobDetails, noOfJobs } = await response.json();

      return await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        noOfJobs,
        jobDetails,
        workerId: this.workerId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      console.error(`Worker ${this.workerId}: scraper failed`, message);

      throw new ApiError(
        500,
        `Worker ${this.workerId}: Something went wrong while scraping jobs`,
        message,
      );
    }
  }

  private captureRequest(page: Page): Promise<Request> {
    return new Promise((resolve) => {
      const handleRequest = (request: Request) => {
        if (!request.url().includes("/jobapi/v3/search")) {
          return;
        }

        page.off("request", handleRequest);
        resolve(request);
      };

      page.on("request", handleRequest);
    });
  }

  private captureResponse(page: Page): Promise<Response> {
    return new Promise((resolve) => {
      const handleResponse = (response: Response) => {
        if (!response.url().includes("/jobapi/v3/search")) {
          return;
        }

        page.off("response", handleResponse);
        resolve(response);
      };

      page.on("response", handleResponse);
    });
  }

  public async close(): Promise<void> {
    console.log(`Worker ${this.workerId}: closing`);

    // Closing the shared browser closes all contexts/pages.
    await Scraper.browser?.close();

    Scraper.browser = null;
    Scraper.instances.clear();
  }
}

export default Scraper;
