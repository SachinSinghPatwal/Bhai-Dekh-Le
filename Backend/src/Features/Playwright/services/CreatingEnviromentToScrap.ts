import { Browser, BrowserContext, Request, Response } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import UrlForPageToDirect from "../utility/ComposeUrl.js";
import { sanitizeCaptureHeaderUrl } from "../helpers/sanitizeCaptureHeaderUrl.js";
import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import eventCaptured from "../utility/CaputringEvents.js";
import { PROXIES } from "../index.js";
import RaceForResponseOrTimeOut from "../../../utility/RaceForResponseOrTimeOut.js";
import { TimeoutError } from "../../../utility/TimeOutError.js";

chromium.use(stealth());

export interface SETUP_RETURNED_VALUES {
  url: URL;
  request: string;
  totalJobsAvaibles: number;
  headers: Record<string, string>;
  jobDetails: JOB_DETAILS[];
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
      // proxy: {
      //   server: PROXIES[0],
      // },
    });

    context = await browser.newContext();

    const page = await context.newPage();

    const { capturedRequest, capturedResponse } = eventCaptured(page);

    await page.goto(UrlForPageToDirect(), {
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
    const totalJobsAvaibles = jsonData.noOfJobs;

    const method = request.method();

    await browser.close();

    return {
      url,
      request: method,
      totalJobsAvaibles,
      headers,
      jobDetails,
    };
  } catch (error: unknown) {
    if (browser) await browser.close();
    if (error instanceof Error) {
      console.log(error);
      throw new Error(
        "Seomthing Went Wrong While Creating the Enviroment to Scrap",
        error,
      );
    }
  }
}
