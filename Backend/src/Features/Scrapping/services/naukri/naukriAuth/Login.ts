import { BrowserContext, Page } from "playwright";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { typeIntoField } from "../../../utility/playwright/interactions/typeIntoField.js";
import { clickButton } from "../../../utility/playwright/interactions/clickButton.js";
import { CLIENT_DATA_PATH, JOB_AUTH_URL, AUTH_SELECTORS } from "../../../../../constants.js";
import ComposeUrl from "../../../utility/ComposeUrl.js";
import { encrypt } from "../../../../../utility/crypto/encryption.js";
import log from "../../../../../utility/Logger.js";

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
  // =========================================================================
  // 1. DATA CHECKING: Verify existing session state
  // =========================================================================
  const hasSavedSession = existsSync(CLIENT_DATA_PATH);

  if (hasSavedSession) {
    log.info(
      `[${workerId}] Authenticated session file found at ${CLIENT_DATA_PATH}. Session is active.`,
    );
    return;
  }

  // =========================================================================
  // 2. DATA CHECKING: Validate required environment credentials
  // =========================================================================
  const email = process.env.NAUKRI_EMAIL;
  const password = process.env.NAUKRI_PASSWORD;

  if (!email || !password) {
    throw new Error(
      `[${workerId}] Missing NAUKRI_EMAIL or NAUKRI_PASSWORD in environment variables for fresh login.`,
    );
  }

  try {
    // =======================================================================
    // 3. NAVIGATION: Navigate to login before any user-requested path
    // =======================================================================
    const loginUrl = ComposeUrl(JOB_AUTH_URL.path);
    log.info(`[${workerId}] No active session found. Navigating to login: ${loginUrl}`);

    await page.goto(loginUrl, {
      waitUntil: "domcontentloaded",
    });

    /*
     * =======================================================================
     * SCOPE: ACCOUNT CREATION / REGISTRATION (NOT BUILT YET)
     * =======================================================================
     * When fresh job details require a new user account, this scope will:
     * 1. Check condition whether account creation is required:
     *    - e.g., if (process.env.CREATE_NEW_ACCOUNT === "true" || userDoesNotExist)
     *
     * 2. Navigate to Naukri registration page or click register trigger:
     *    - await clickButton(page, { selector: AUTH_SELECTORS.registerButton });
     *    - OR await page.goto("https://www.naukri.com/registration/createRegister", { waitUntil: "domcontentloaded" });
     *
     * 3. Fill required user profile details with human-like interactions:
     *    - Full Name:
     *      await typeIntoField(page, { selector: AUTH_SELECTORS.nameField }, process.env.NAUKRI_NAME ?? "New User", { humanDelay: 90 });
     *    - Email ID:
     *      await typeIntoField(page, { selector: AUTH_SELECTORS.emailField }, email, { humanDelay: 90 });
     *    - Password:
     *      await typeIntoField(page, { selector: AUTH_SELECTORS.passwordField }, password, { humanDelay: 80 });
     *    - Mobile Number:
     *      await typeIntoField(page, { selector: AUTH_SELECTORS.mobileField }, process.env.NAUKRI_MOBILE ?? "", { humanDelay: 60 });
     *    - Work Status:
     *      await clickButton(page, { selector: "div[data-val='fresher']" });
     *
     * 4. Submit Registration:
     *    - await clickButton(page, { selector: AUTH_SELECTORS.registerSubmit }, { timeout: 10_000 });
     *
     * 5. Verification / OTP Handling:
     *    - Wait for OTP screen / mobile verification if required.
     * =======================================================================
     */

    // =======================================================================
    // 4. PERFORM LOGIN: Enter credentials and submit
    // =======================================================================
    log.info(`[${workerId}] Typing login credentials...`);

    await typeIntoField(
      page,
      { selector: AUTH_SELECTORS.usernameField },
      email,
      { humanDelay: 100 },
    );

    await typeIntoField(
      page,
      { selector: AUTH_SELECTORS.passwordField },
      password,
      { humanDelay: 70 },
    );

    await clickButton(
      page,
      { selector: AUTH_SELECTORS.loginSubmit },
      { timeout: 10_000 },
    );

    // =======================================================================
    // 5. WAIT FOR AUTHENTICATION COMPLETION
    // =======================================================================
    await page.waitForURL((url) => !url.href.includes("nlogin/login"), {
      timeout: 60_000,
    });

    // =======================================================================
    // 6. PERSIST SESSION: Extract, encrypt, and store auth state
    // =======================================================================
    const storageState = await context.storageState();
    const encrypted = encrypt(storageState);

    await fs.mkdir(path.dirname(CLIENT_DATA_PATH), { recursive: true });
    await fs.writeFile(CLIENT_DATA_PATH, JSON.stringify(encrypted), "utf8");

    log.success(
      `[${workerId}] Successfully authenticated and stored encrypted client auth state.`,
    );
  } catch (error) {
    log.error(`[${workerId}] Authentication failed: ${error}`);
    throw new Error(`Something went wrong while logging in: ${(error as Error)?.message ?? error}`);
  }
}
