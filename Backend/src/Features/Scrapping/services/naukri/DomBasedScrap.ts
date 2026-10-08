import { JOB_AUTH_URL, log } from "../../index.js";
import ComposeUrl from "../../utility/ComposeUrl.js";
import { CreatingEnvironmentToScrap } from "../CreatingEnvironmentToScrap.js";
import loginToNaukri from "./naukriAuth/Login.js";
import type { Page, Response, BrowserContext } from "playwright";

import fs from "node:fs/promises";
import { encrypt } from "../../../../utility/crypto/encryption.js";
import { CLIENT_DATA_PATH } from "../../../../constants.js";

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
  const { page, capturedResponse, context } = (await CreatingEnvironmentToScrap(
    {
      navigateTo: ComposeUrl(JOB_AUTH_URL.path),
      headless: false,
      browserShutdownStatus: "keepAlive",
    },
  )) as {
    page: Page;
    capturedResponse: Promise<Response>;
    context: BrowserContext;
  };
  try {
    await loginToNaukri(page, context);
    // const response = await RaceForResponseOrTimeOut<Response>(capturedResponse);
    // const jsonData = await response.json();
    // const jobDetails = jsonData.jobDetails;
    // console.log(jobDetails)

    const state = await context.storageState();

    const encrypted = encrypt(state);

    await fs.writeFile(CLIENT_DATA_PATH, JSON.stringify(encrypted), "utf8");

  } catch (error) {
    log.warn(error);
  }
}
