import { Browser, BrowserContext, Request } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { interceptingBrowsersHttpCommunication } from "../../../helpers/Playwright/interceptingBrowsersHttpCommunication.js";
import UrlForPageToDirect from "../utility/ComposeUrl.js";
import { sanitizeCaptureHeaderUrl } from "../../../helpers/Playwright/sanitizeCaptureHeaderUrl.js";
import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";

chromium.use(stealth());

export interface SETUP_RETURNED_VALUES {
  url: URL;
  request: Request;
  totalJobsAvaibles: number;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
  browser: Browser;
}
export async function CreatingEnviromentToScrap(): Promise<
  SETUP_RETURNED_VALUES | undefined
> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--start-minimized"],
    });

    context = await browser.newContext();

    const page = await context.newPage();

    const capturedRequest = new Promise<Request>((resolve) => {
      page.on(
        "request",
        interceptingBrowsersHttpCommunication(page, resolve as any, "request"),
      );
    });

    const capturedResponse = new Promise<Response>((resolve) => {
      page.on(
        "response",
        interceptingBrowsersHttpCommunication(page, resolve as any, "response"),
      );
    });
    await page.goto(UrlForPageToDirect(), {
      waitUntil: "domcontentloaded",
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Timeout intercepting network requests")),
        30000,
      ),
    );

    const request = (await Promise.race([
      capturedRequest,
      timeoutPromise,
    ])) as Request;
    const response = (await Promise.race([
      capturedResponse,
      timeoutPromise,
    ])) as Response;

    const url = new URL(request.url());

    const capturedHeaders = await request.allHeaders();
    const headers = sanitizeCaptureHeaderUrl(capturedHeaders);

    const jsonData = await response.json();

    const jobDetails = jsonData.jobDetails;
    const totalJobsAvaibles = jsonData.noOfJobs ?? jsonData.totalJobs ?? 100; // default to 100 for safety if missing

    const method = request.method();
    const mockRequest = { method: () => method } as any;

    await browser.close();

    return {
      url,
      request: mockRequest,
      totalJobsAvaibles,
      headers,
      jobDetails,
      browser: null as any,
    };
  } catch (error: unknown) {
    if (browser) await browser.close();
    if (error instanceof Error) {
      throw new Error(
        "Seomthing Went Wrong While Creating the Enviroment to Scrap",
      );
    }
  }
}
