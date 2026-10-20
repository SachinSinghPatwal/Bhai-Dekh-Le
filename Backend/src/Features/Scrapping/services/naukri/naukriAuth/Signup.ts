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
} from "../../../index.js";

export default async function SignUpUser(
  page: Page,
  context: BrowserContext,
  workerId: string,
  credentials: string[],
): Promise<void> {
  try {
    const signUpUrl = ComposeUrl(JOB_AUTH_URL.signUpPath);
    log.info(
      `[${workerId}] No active session found. Navigating to SignUp: ${signUpUrl}`,
    );

    await page.goto(signUpUrl, {
      waitUntil: "domcontentloaded",
    });
    log.info(`[${workerId}] Typing login credentials...`);

    credentials.forEach(
      async (each:string) =>
        await typeIntoField(
          page,
          { selector: AUTH_SELECTORS.signedUserField },
          each,
          { humanDelay: 100 },
        ),
    );

    await clickButton(
      page,
      { selector: AUTH_SELECTORS.navigatetoPhoneVerification },
      { timeout: 5_000 },
    );
    await page.waitForURL((url) => !url.href.includes(signUpUrl), {
      timeout: 10_000,
    });

    let isVisible = false;

    while (!isVisible) {
      await clickButton(page, { selector: AUTH_SELECTORS.editPhoneNumber });
      await clickButton(
        page,
        { selector: AUTH_SELECTORS.editPhoneNumber },
        { timeout: 5_000 },
      );

      await editPhoneInputField(
        page,
        { selector: AUTH_SELECTORS.mobileField },
        { timeout: 5_000 },
      );

      await clickButton(
        page,
        { selector: AUTH_SELECTORS.sendOTP },
        { timeout: 5_000 },
      );
      isVisible = await CheckForElement(page, AUTH_SELECTORS.skip, {
        timeout: 5_000,
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
