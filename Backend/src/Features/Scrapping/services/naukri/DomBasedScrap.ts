import { JOB_AUTH_URL, log } from "../../index.js";
import ComposeUrl from "../../utility/ComposeUrl.js";
import RaceForResponseOrTimeOut from "../../utility/playwright/RaceForResponseOrTimeOut.js";
import { CreatingEnvironmentToScrap } from "../CreatingEnvironmentToScrap.js";
import loginToNaukri from "./naukriAuth/Login.js";
import type { Page, Response } from "playwright";

export default async function domScrapping(
  workerId: string,
  totalNumberOfJobs: number,
) {
  /**
   * Use the lightweight DOM setup — the full HTTP-intercepting environment
   * would timeout on the login page since there is no matching JSON API response.
   * ComposeUrl is required because JOB_AUTH_URL.path is a relative path and
   * page.goto() requires a full URL.
   */
  const { page, capturedResponse } = (await CreatingEnvironmentToScrap({
    navigateTo: ComposeUrl(JOB_AUTH_URL.path),
    headless: false,
    browserShutdownStatus: "keepAlive",
  })) as { page: Page; capturedResponse: Promise<Response> };
  try {
    await loginToNaukri(page);
    const response = await RaceForResponseOrTimeOut<Response>(capturedResponse);
    const jsonData = await response.json();
    const jobDetails = jsonData.jobDetails;
    console.log(jobDetails)
  } catch (error) {
    log.warn(error);
  }
}
