import { BrowserContext, Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { typeIntoField } from "../../../utility/playwright/interactions/index.js";
import {
  CLIENT_DATA_PATH,
  JOB_AUTH_URL,
  AUTH_SELECTORS,
  NAUKRI_BASE_URL,
} from "../../../../../constants.js";
import ComposeUrl from "../../../utility/ComposeUrl.js";
import log from "../../../../../utility/Logger.js";
import { encrypt } from "../../../../../utility/crypto/encryption.js";
import checkSavedSessionAndUserCredentialsForAuth from "../../../helpers/CheckSavedSessionAndUserCredentialsForAuth.js";
import interceptResponseOnAction from "../../../helpers/interceptResponseOnAction.js";
import SignUpUser from "./Signup.js";

export default async function loginToNaukri(
  page: Page,
  context: BrowserContext,
  workerId: string = "auth-worker",
): Promise<void> {
  const authCredentials = checkSavedSessionAndUserCredentialsForAuth(workerId);
  if (!authCredentials) {
    return;
  }

  const { email, password, phoneNumber, username } = authCredentials;
  const credentials = [username, email, password, phoneNumber];
  const checkFor = { doesUserHaveAccount: false, maxRetriesCount: 3 };
  let attempt = 0;

  while (!checkFor.doesUserHaveAccount && attempt < checkFor.maxRetriesCount) {
    try {
      const loginUrl = ComposeUrl(JOB_AUTH_URL.loginPath, NAUKRI_BASE_URL);
      log.info(
        `[${workerId}] No active session found. Navigating to login: ${loginUrl}`,
      );

      await page.goto(loginUrl, {
        waitUntil: "domcontentloaded",
      });
      log.info(`[${workerId}] Typing login credentials...`);

      await typeIntoField(
        page,
        { selector: AUTH_SELECTORS.signedUserField },
        email,
      );

      await typeIntoField(
        page,
        { selector: AUTH_SELECTORS.signedPasswordField },
        password,
      );

      const outcome = await interceptResponseOnAction(page, {
        selector: AUTH_SELECTORS.loginSubmit,
        targetStatus: 401,
        responseTimeout: 10_000,
        navigationTimeout: 10_000,
        waitForUrl: (url: URL) => !url.href.includes("nlogin/login"),
      });

      if (outcome === "status_matched") {
        log.warn(
          `[${workerId}] Intercepted 401 Unauthorized response from login. Navigating directly to signup...`,
        );
        await SignUpUser(page, context, workerId, credentials);
        checkFor.doesUserHaveAccount = true;
        break;
      }

      const storageState = await context.storageState();
      const encrypted = encrypt(storageState);

      await fs.mkdir(path.dirname(CLIENT_DATA_PATH), { recursive: true });
      await fs.writeFile(CLIENT_DATA_PATH, JSON.stringify(encrypted), "utf8");

      log.success(
        `[${workerId}] Successfully authenticated and stored encrypted client auth state.`,
      );
      checkFor.doesUserHaveAccount = true;
      break;
    } catch (error) {
      log.error(
        `[${workerId}] Login failed trying creating new account Reason : ${(error as Error).message}`,
      );
      await SignUpUser(page, context, workerId, credentials);
      attempt++;
    }
  }
}

const Login = loginToNaukri;
export { Login };
