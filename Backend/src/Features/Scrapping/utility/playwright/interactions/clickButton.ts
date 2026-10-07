import { Page } from "playwright";
import { ElementSelector, WaitOptions } from "./types.js";
import { resolveSelector, waitForPageReady } from "./utils.js";

/**
 * Waits for the page to be fully ready (network idle) and then clicks the
 * element identified by the provided {@link ElementSelector}.
 *
 * The element is also waited on to be visible and stable before the click,
 * so transient loading spinners / overlays will not block the action.
 *
 * @param page     - Active Playwright {@link Page} instance.
 * @param target   - Selector describing the button / element to click.
 * @param options  - Optional timeout override (default: 30 000 ms).
 *
 * @example
 * // Click by id
 * await clickButton(page, { id: "submit-btn" });
 *
 * // Click by class
 * await clickButton(page, { className: "btn-primary" });
 *
 * // Click by data attribute
 * await clickButton(page, { attribute: { name: "data-testid", value: "login" } });
 *
 * // Click with raw selector
 * await clickButton(page, { selector: "button[type='submit']" });
 */
export async function clickButton(
  page: Page,
  target: ElementSelector,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout = 30_000 } = options;
  const cssSelector = resolveSelector(target);

  // Most assured readiness check – networkidle covers DOM + network + assets + JS
  await waitForPageReady(page, timeout);

  // Additionally wait for the specific element to be visible before clicking
  await page.waitForSelector(cssSelector, { state: "visible", timeout });

  await page.click(cssSelector, { timeout });
}
