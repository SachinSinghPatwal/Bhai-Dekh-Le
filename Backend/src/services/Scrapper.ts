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
  // One Scraper instance per worker
  private static instances = new Map<string, Scraper>();

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  private constructor(private readonly workerId: string) {}

  public static async getInstance(workerId: string): Promise<Scraper> {
    let scraper = Scraper.instances.get(workerId);

    if (!scraper) {
      scraper = new Scraper(workerId);

      scraper.browser = await chromium.launch({
        headless: false,
      });

      scraper.context = await scraper.browser.newContext();

      Scraper.instances.set(workerId, scraper);
    }

    return scraper;
  }

  private getContext(): BrowserContext {
    if (!this.context) {
      throw new Error(
        `Worker ${this.workerId}: Browser context is not initialized`,
      );
    }

    return this.context;
  }

  public async createPage(): Promise<Page> {
    return this.getContext().newPage();
  }

  public async scrape(): Promise<JOB_DETAILS[] | undefined> {
    let page: Page | undefined;

    try {
      console.log(`Worker ${this.workerId}: starting scraper`);

      page = await this.createPage();

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
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      console.error(`Worker ${this.workerId}: scraper failed`, message);

      throw new ApiError(
        500,
        `Worker ${this.workerId}: Something went wrong while scraping jobs`,
        message,
      );
    } finally {
      await page?.close();
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
    console.log(`Worker ${this.workerId}: closing scraper`);

    // Closing browser also closes its context and pages.
    await this.browser?.close();

    this.browser = null;
    this.context = null;

    Scraper.instances.delete(this.workerId);
  }
}

export default Scraper;
