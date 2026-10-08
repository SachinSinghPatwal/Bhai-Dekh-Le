import { Page } from "playwright";
import { typeIntoField } from "../../../utility/playwright/interactions/typeIntoField.js";
import { clickButton } from "../../../utility/playwright/interactions/clickButton.js";

export default async function loginToNaukri(page: Page): Promise<void> {
  /**
   * @description Human-like typing at ~100ms per keystroke
   * */
  try {
    await typeIntoField(
      page,
      { id: "usernameField" },
      process.env.NAUKRI_EMAIL!,
      { humanDelay: 100 },
    );
    await typeIntoField(
      page,
      { id: "passwordField" },
      process.env.NAUKRI_PASSWORD!,
      { humanDelay: 70 },
    );
    await clickButton(
      page,
      { selector: "button[type='submit']" },
      { timeout: 10_000 },
    );
  } catch (error) {
    throw new Error("Something went wrong while logging in")
  }
}
