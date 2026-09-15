import { Browser, BrowserContext, chromium, Request } from "playwright";
import { interceptingBrowsersHttpCommunication } from "../../helpers/Playwright/interceptingBrowsersHttpCommunication.js";
import UrlForPageToDirect from "../../utility/playwright/ComposeUrl.js";
import { sanitizeCaptureHeaderUrl } from "../../helpers/Playwright/sanitizeCaptureHeaderUrl.js";
import { JOB_DETAILS } from "../../models/Mongo/job.models.js";

export interface SETUP_RETURNED_VALUES {
  url: URL;
  request: Request;
  noOfJobs: number;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
  browser:Browser;
}
export async function CreatingEnviromentToScrap(): Promise<
  SETUP_RETURNED_VALUES | undefined
> {
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

    const request = await capturedRequest;
    const response = await capturedResponse;

    const url = new URL(request.url());

    const capturedHeaders = await request.allHeaders();

    const headers = sanitizeCaptureHeaderUrl(capturedHeaders);

    const { jobDetails, noOfJobs } = await response.json();

    return { url, request, noOfJobs, headers, jobDetails,browser };
  } catch (error: unknown) {
    browser?.close();
    if (error instanceof Error) {
      throw new Error(
        "Seomthing Went Wrong While Creating the Enviroment to Scrap",
      );
    }
  }
}
