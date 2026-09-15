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
  /**
   * One Browser per Node.js worker process.
   *
   * fork() creates separate Node.js processes,
   * therefore each process has its own static browser.
   */
  private static browser: Browser | null = null;

  /**
   * Scraper instances live only inside this worker process.
   */
  private static instances = new Map<string, Scraper>();

  /**
   * One isolated browser environment for this scraper.
   */
  private context: BrowserContext | null = null;

  /**
   * One page belonging to this context.
   */
  private page: Page | null = null;

  private constructor(private readonly workerId: string) {}

  public static async getInstance(workerId: string): Promise<Scraper> {
    /*
     * Browser belongs to THIS Node.js process.
     *
     * Worker 1:
     *   Scraper.browser → Chromium 1
     *
     * Worker 2:
     *   Scraper.browser → Chromium 2
     */
    if (!Scraper.browser) {
      console.log(`Worker ${workerId}: CHROMIUM LAUNCH STARTED`);

      try {
        Scraper.browser = await chromium.launch({
          headless: false,
        });
        console.log(`Worker ${workerId}: CHROMIUM LAUNCH SUCCEEDED`);
      } catch (err) {
        console.error(`Worker ${workerId}: CHROMIUM LAUNCH FAILED:`, err);
        throw err;
      }
    }

    let scraper = Scraper.instances.get(workerId);

    if (!scraper) {
      scraper = new Scraper(workerId);

      /*
       * Context is isolated from other contexts
       * inside this browser.
       */
      scraper.context = await Scraper.browser.newContext();

      /*
       * Page belongs to the context.
       */
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

    /*
     * Close this scraper's context first.
     *
     * This closes its pages.
     */
    await this.context?.close();

    this.context = null;
    this.page = null;

    Scraper.instances.delete(this.workerId);
  }

  /**
   * Call this when the ENTIRE worker process
   * is shutting down.
   */
  public static async closeBrowser(): Promise<void> {
    console.log("Closing worker browser");

    await Scraper.browser?.close();

    Scraper.browser = null;
    Scraper.instances.clear();
  }
}

export default Scraper;
