import { JOB_AUTH_URL, log } from "../../index.js";
import ComposeUrl from "../../utility/ComposeUrl.js";
import { CreatingEnvironmentToScrap } from "../CreatingEnvironmentToScrap.js";
import loginToNaukri from "./naukriAuth/Login.js";
import searchSkillsAndKeywords from "./naukriSearch/SearchingSkillsAndKeywords.js";
import type { Page, Response, BrowserContext } from "playwright";

import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { encrypt } from "../../../../utility/crypto/encryption.js";
import { CLIENT_DATA_PATH } from "../../../../constants.js";

export default async function domScrapping(
  workerId: string,
  _totalNumberOfJobs: number,
) {
  const hasSavedSession = existsSync(CLIENT_DATA_PATH);

  const { page, capturedResponse: _capturedResponse, context } = (await CreatingEnvironmentToScrap(
    {
      navigateTo: hasSavedSession
        ? "https://naukri.com/mnjuser/homepage"
        : ComposeUrl(JOB_AUTH_URL.path),
      headless: false,
      browserShutdownStatus: "keepAlive",
      useStorageState: hasSavedSession,
    },
  )) as {
    page: Page;
    capturedResponse: Promise<Response>;
    context: BrowserContext;
  };
  try {
    if (!hasSavedSession) {
      await loginToNaukri(page, context);
      await page.waitForURL((url) => !url.href.includes("nlogin/login"), {
        timeout: 60_000,
      });

      const state = await context.storageState();

      const encrypted = encrypt(state);

      await fs.mkdir(path.dirname(CLIENT_DATA_PATH), { recursive: true });
      await fs.writeFile(CLIENT_DATA_PATH, JSON.stringify(encrypted), "utf8");

      log.success(`[${workerId}] Successfully stored encrypted client auth state.`);
      await searchSkillsAndKeywords(page);
    } else {
      log.info(`[${workerId}] Authenticated session loaded. Ready on homepage.`);
      await searchSkillsAndKeywords(page);
    }
  } catch (error) {
    log.warn(error);
  }
}
