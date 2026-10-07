import { Page } from "playwright";
import { ElementSelector, WaitOptions } from "./types.js";
import { resolveSelector, waitForPageReady } from "./utils.js";

/**
 * Options for {@link selectDropdownOption}.
 */
export interface DropdownOptions extends WaitOptions {
  /**
   * Strategy for selecting the option inside the dropdown.
   *
   * - `"value"`  – matches the `<option value="…">` attribute (default)
   * - `"label"`  – matches the visible text of the option
   * - `"index"`  – selects by zero-based index (provide numeric string)
   */
  strategy?: "value" | "label" | "index";
}

/**
 * Selects an option inside a `<select>` dropdown element.
 *
 * Works with native HTML `<select>` elements.  For custom (JS-driven)
 * dropdowns – e.g. those built with `<div>` / `<ul>` – use
 * {@link clickDropdownThenOption} instead.
 *
 * Page readiness is guaranteed before interacting.
 *
 * @param page       - Active Playwright {@link Page} instance.
 * @param dropdown   - Selector for the `<select>` element.
 * @param optionValue - The value / label / index to select (based on `strategy`).
 * @param options    - Strategy and timeout overrides.
 *
 * @example
 * // Select by value (default)
 * await selectDropdownOption(page, { id: "country-select" }, "IN");
 *
 * // Select by visible label
 * await selectDropdownOption(page, { id: "country-select" }, "India", { strategy: "label" });
 *
 * // Select by index
 * await selectDropdownOption(page, { id: "country-select" }, "2", { strategy: "index" });
 */
export async function selectDropdownOption(
  page: Page,
  dropdown: ElementSelector,
  optionValue: string,
  options: DropdownOptions = {},
): Promise<void> {
  const { timeout = 30_000, strategy = "value" } = options;
  const cssSelector = resolveSelector(dropdown);

  await waitForPageReady(page, timeout);
  await page.waitForSelector(cssSelector, { state: "visible", timeout });

  switch (strategy) {
    case "label":
      await page.selectOption(cssSelector, { label: optionValue }, { timeout });
      break;
    case "index":
      await page.selectOption(
        cssSelector,
        { index: Number(optionValue) },
        { timeout },
      );
      break;
    case "value":
    default:
      await page.selectOption(cssSelector, { value: optionValue }, { timeout });
      break;
  }
}

/**
 * Handles **custom** (non-native) dropdown menus that are built with divs,
 * spans, or `<ul><li>` lists.
 *
 * Steps:
 *  1. Wait for full page readiness (networkidle).
 *  2. Click the trigger element to open the dropdown panel.
 *  3. Wait for the option element to appear.
 *  4. Click the option.
 *
 * @param page        - Active Playwright {@link Page} instance.
 * @param trigger     - Selector for the element that opens the dropdown (the toggle button).
 * @param option      - Selector for the specific option item to click inside the expanded dropdown.
 * @param options     - Timeout override.
 *
 * @example
 * // Click a custom dropdown trigger then select an option by data-value attribute
 * await clickDropdownThenOption(
 *   page,
 *   { className: "custom-select__control" },
 *   { attribute: { name: "data-value", value: "engineer" } },
 * );
 */
export async function clickDropdownThenOption(
  page: Page,
  trigger: ElementSelector,
  option: ElementSelector,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout = 30_000 } = options;
  const triggerSelector = resolveSelector(trigger);
  const optionSelector = resolveSelector(option);

  await waitForPageReady(page, timeout);
  await page.waitForSelector(triggerSelector, { state: "visible", timeout });

  // Open the dropdown
  await page.click(triggerSelector, { timeout });

  // Wait for the option to become visible in the expanded panel
  await page.waitForSelector(optionSelector, { state: "visible", timeout });

  // Select the option
  await page.click(optionSelector, { timeout });
}
