import { chromium, type Request } from "playwright";
import { sanitizeCaptureHeaderUrl } from "../helpers/Playwright/sanitizeCaptureHeaderUrl.js";
import makeHttpRequestToGetAllDesiredJobs from "./ComposeHttpRequest.js";
import { ApiError } from "../utility/ApiError.js";
import UrlForPageToDirect from "../utility/ComposeUrl.js";

export default async function Scraper(): Promise<
  Record<string, number>[] | undefined
> {
  let collectedData;
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("request", async (request: Request) => {
      if (!request.url().includes("/jobapi/v3/search")) {
        return;
      }
      const url = new URL(request.url());
      const capturedHeaders = await request.allHeaders();
      const headers = sanitizeCaptureHeaderUrl(capturedHeaders);
      collectedData = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
      });
      console.log("collected data from Scrapper",collectedData);
      
    });
    await page.goto(UrlForPageToDirect());
    await page.waitForTimeout(10000);
    await browser.close();
    return collectedData;
  } catch (error) {
    await browser.close();
    throw new ApiError(
      500,
      "Something Went Wrong while Collecting/Scrapping Job data",
    );
  }
}
