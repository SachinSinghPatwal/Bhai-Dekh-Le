import { BrowserContext, Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import {
  typeIntoField,
  CLIENT_DATA_PATH,
  JOB_AUTH_URL,
  AUTH_SELECTORS,
  ComposeUrl,
  log,
  encrypt,
  checkSavedSessionAndUserCredentialsForAuth,
  interceptResponseOnAction,
} from "../../../index.js";
import SignUpUser from "./Signup.js";

/**
 * Handles Naukri authentication lifecycle:
 * 1. Checks if a saved authenticated session state already exists on disk.
 * 2. If present, verifies and utilizes the existing session without re-navigating to login.
 * 3. If absent, validates login credentials, navigates to the login page first,
 *    provides scope for account creation / registration, performs login, and saves encrypted session state.
 *
 * @param page - Playwright Page instance
 * @param context - Playwright BrowserContext instance
 * @param workerId - Identifier of worker triggering authentication
 */
export default async function loginToNaukri(
  page: Page,
  context: BrowserContext,
  workerId: string = "auth-worker",
): Promise<void> {
  const authCredentials = checkSavedSessionAndUserCredentialsForAuth(workerId);
  if (!authCredentials) {
    // Authenticated session file found and already loaded into context
    return;
  }

  const { email, password, phoneNumber, username } = authCredentials;
  const credentials = [username, email, password, phoneNumber];
  const checkFor = { doesUserHaveAccount: false, maxRetriesCount: 3 };
  let attempt = 0;

  while (!checkFor.doesUserHaveAccount && attempt < checkFor.maxRetriesCount) {
    try {
      const loginUrl = ComposeUrl(JOB_AUTH_URL.loginPath);
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
        waitForUrl: (url) => !url.href.includes("nlogin/login"),
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
