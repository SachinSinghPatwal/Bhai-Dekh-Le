import { Page } from "playwright";
import { ElementSelector, WaitOptions } from "./types.js";
import { resolveSelector, waitForPageReady } from "./utils.js";

/**
 * Options for {@link editPhoneInputField}.
 */
export interface EditPhoneOptions extends WaitOptions {
  /**
   * Keystroke delay in milliseconds when typing the new digit.
   * Defaults to 50 ms.
   */
  delay?: number;

  /**
   * Whether to wait for network/DOM idle before interacting.
   * Defaults to false.
   */
  waitForPage?: boolean;
}

/**
 * Result returned by {@link editPhoneInputField}.
 */
export interface EditPhoneResult {
  previousValue: string;
  newValue: string;
  previousLastDigit: string;
  newLastDigit: string;
}

/**
 * Focuses a pre-filled phone input field, positions the cursor at the end,
 * removes the last digit, and appends a random whole, non-decimal digit (0–9)
 * that is strictly different from the previous digit.
 *
 * @param page    - Active Playwright {@link Page} instance.
 * @param target  - Selector describing the input element (`ElementSelector` or CSS string).
 * @param options - Optional timeout, typing delay, and page readiness flags.
 * @returns Details of the modification including the previous and updated values.
 *
 * @example
 * // Edit phone number field by selector
 * const result = await editPhoneInputField(page, { selector: "#mobile" });
 * console.log(`Changed ${result.previousLastDigit} -> ${result.newLastDigit}`);
 *
 * // Edit with custom timeout
 * await editPhoneInputField(page, { id: "mobile" }, { timeout: 5_000 });
 */
export async function editPhoneInputField(
  page: Page,
  target: ElementSelector | string,
  options: EditPhoneOptions = {},
): Promise<EditPhoneResult> {
  const { timeout = 10_000, delay = 50, waitForPage = false } = options;

  if (waitForPage) {
    await waitForPageReady(page, 3_000);
  }

  const cssSelector =
    typeof target === "string" ? target : resolveSelector(target);

  const locator = page.locator(cssSelector).first();
  await locator.waitFor({ state: "visible", timeout });

  // 1. Select the input (focus and click into it)
  try {
    await locator.click({ timeout: 5_000, force: true });
  } catch {
    await locator.focus();
  }

  // 2. Read the existing pre-filled value
  const previousValue = await locator.inputValue();
  const previousLastDigit =
    previousValue.length > 0 ? previousValue.slice(-1) : "";

  // 3. Position the cursor at the end of the text
  await locator.evaluate((el: HTMLInputElement) => {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
  await page.keyboard.press("End");

  // 4. Remove the last digit
  await page.keyboard.press("Backspace");

  // 5. Generate a random whole, non-decimal integer digit (0 to 9) that is not the previous one
  const candidateDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map(String)
    .filter((digit) => digit !== previousLastDigit);

  // Pick a random whole digit from the valid candidates
  const randomIndex = Math.floor(Math.random() * candidateDigits.length);
  const newLastDigit = candidateDigits[randomIndex];

  // 6. Type the new random whole digit
  await page.keyboard.type(newLastDigit, { delay });

  const newValue = await locator.inputValue();

  return {
    previousValue,
    newValue,
    previousLastDigit,
    newLastDigit,
  };
}

export default editPhoneInputField;
