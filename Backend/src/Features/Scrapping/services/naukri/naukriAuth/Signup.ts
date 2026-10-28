import { BrowserContext, Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import {
  typeIntoField,
  clickButton,
  editPhoneInputField,
  CLIENT_DATA_PATH,
  JOB_AUTH_URL,
  AUTH_SELECTORS,
  ComposeUrl,
  log,
  encrypt,
  CheckForElement,
  NAUKRI_BASE_URL,
} from "../../../index.js";

export default async function SignUpUser(
  page: Page,
  context: BrowserContext,
  workerId: string,
  credentials: string[],
): Promise<void> {
  try {
    const signUpUrl = ComposeUrl(JOB_AUTH_URL.signUpPath, NAUKRI_BASE_URL);
    log.info(
      `[${workerId}] No active session found. Navigating to SignUp: ${signUpUrl}`,
    );

    await page.goto(signUpUrl, {
      waitUntil: "domcontentloaded",
    });
    log.info(`[${workerId}] Typing login credentials...`);

    const [name, email, password, mobile] = credentials;

    const fieldsToType = [
      { selector: AUTH_SELECTORS.nameField, value: name },
      { selector: AUTH_SELECTORS.emailField, value: email },
      { selector: AUTH_SELECTORS.passwordField, value: password },
      { selector: AUTH_SELECTORS.mobileField, value: mobile },
    ];

    for (const field of fieldsToType) {
      if (field.value) {
        await typeIntoField(page, { selector: field.selector }, field.value);
      }
    }

    await clickButton(page, {
      selector: AUTH_SELECTORS.userType,
    });

    await clickButton(page, { selector: AUTH_SELECTORS.loginSubmit });

    // Wait for the verification step / editPhoneNumber button to appear (or URL change)
    const hasVerificationStep = await CheckForElement(
      page,
      { selector: AUTH_SELECTORS.editPhoneNumber },
      { timeout: 10_000 },
    );

    if (!hasVerificationStep) {
      await page
        .waitForURL((url) => !url.href.includes(signUpUrl), {
          timeout: 10_000,
        })
        .catch(() => {});
    }

    let isVisible = false;

    while (!isVisible) {
      await clickButton(page, { selector: AUTH_SELECTORS.editPhoneNumber });

      await editPhoneInputField(
        page,
        { selector: AUTH_SELECTORS.refillMobileField },
        { timeout: 10_000 },
      );

      await clickButton(page, { selector: AUTH_SELECTORS.sendOTP });
      isVisible = await CheckForElement(page, AUTH_SELECTORS.skip, {
        timeout: 10_000,
      });
    }

    const storageState = await context.storageState();
    const encrypted = encrypt(storageState);

    await fs.mkdir(path.dirname(CLIENT_DATA_PATH), { recursive: true });
    await fs.writeFile(CLIENT_DATA_PATH, JSON.stringify(encrypted), "utf8");

    log.success(
      `[${workerId}] Successfully authenticated and stored encrypted client auth state.`,
    );
  } catch (error) {
    log.error(`[${workerId}] signup failed: ${error}`);
    throw new Error(
      `Something went wrong while signingup user in: ${(error as Error)?.message ?? error}`,
    );
  }
}
