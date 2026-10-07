import { Page } from "playwright";
import { ElementSelector, WaitOptions } from "./types.js";
import { resolveSelector, waitForPageReady } from "./utils.js";

/**
 * Options for {@link typeIntoField}.
 */
export interface TypeOptions extends WaitOptions {
  /**
   * Whether to clear the field before typing.
   * Defaults to `true`.
   */
  clearFirst?: boolean;

  /**
   * Delay between keystrokes in milliseconds to simulate human-like typing.
   *
   * When set, Playwright's `locator.pressSequentially()` API is used (which
   * fires proper `keydown` → `keypress` → `input` → `keyup` events per character).
   *
   * Set to `0` or omit for instant fill via `page.fill()` (faster, no delay).
   * A realistic human range is 40–120 ms.
   *
   * Defaults to `0` (instant fill).
   */
  humanDelay?: number;

  /**
   * Optional pause in milliseconds **after** typing completes, e.g. to wait for
   * autocomplete suggestions to appear.
   * Defaults to `0` (no pause).
   */
  postTypeDelay?: number;
}

/**
 * Focuses an input / textarea and types text into it, with optional human-like
 * keystroke delay.
 *
 * - When `humanDelay` > 0: uses `locator.pressSequentially()` which dispatches
 *   individual key events per character — ideal for search boxes with autocomplete or sites
 *   that listen to keyboard events.
 * - When `humanDelay` is 0 (default): uses `page.fill()` which sets the value
 *   directly and fires change/input events — faster and more reliable for plain
 *   form inputs.
 *
 * Page readiness (networkidle) is verified before any action.
 *
 * @param page    - Active Playwright {@link Page} instance.
 * @param field   - Selector for the input / textarea / search box.
 * @param text    - Text to type into the field.
 * @param options - Typing behaviour options.
 *
 * @example
 * // Instant fill (no delay)
 * await typeIntoField(page, { id: "search-input" }, "software engineer");
 *
 * // Human-like typing at ~70 ms per key
 * await typeIntoField(page, { id: "search-input" }, "software engineer", { humanDelay: 70 });
 *
 * // Class-based selector with post-type pause for autocomplete
 * await typeIntoField(
 *   page,
 *   { className: "search-box__input" },
 *   "react developer",
 *   { humanDelay: 60, postTypeDelay: 800 },
 * );
 *
 * // Attribute-based selector
 * await typeIntoField(
 *   page,
 *   { attribute: { name: "placeholder", value: "Search jobs..." } },
 *   "backend developer",
 * );
 */
export async function typeIntoField(
  page: Page,
  field: ElementSelector,
  text: string,
  options: TypeOptions = {},
): Promise<void> {
  const {
    timeout = 30_000,
    clearFirst = true,
    humanDelay = 0,
    postTypeDelay = 0,
  } = options;

  const cssSelector = resolveSelector(field);

  // Ensure page is fully ready before interacting
  await waitForPageReady(page, timeout);
  await page.waitForSelector(cssSelector, { state: "visible", timeout });

  if (clearFirst) {
    // Triple-click to select all existing text, then clear it
    await page.click(cssSelector, { clickCount: 3, timeout });
    await page.keyboard.press("Backspace");
  }

  if (humanDelay > 0) {
    // Human-like keystroke-by-keystroke typing with per-key delay
    await page.locator(cssSelector).pressSequentially(text, { delay: humanDelay });
  } else {
    // Instant fill — sets value + dispatches input/change events
    await page.fill(cssSelector, text, { timeout });
  }

  if (postTypeDelay > 0) {
    await page.waitForTimeout(postTypeDelay);
  }
}
