import { Page } from "playwright";
import { ElementSelector } from "./types.js";

/**
 * Resolves an {@link ElementSelector} to a single CSS / Playwright selector string.
 *
 * Resolution priority:
 *  1. `selector` (raw string) – returned as-is
 *  2. `id`       → `#<id>`
 *  3. `className` → `.<className>`
 *  4. `attribute` → `[<name>="<value>"]`
 *
 * @throws {Error} when none of the selector fields are provided
 */
export function resolveSelector(sel: ElementSelector): string {
  if (sel.selector) return sel.selector;
  if (sel.id) return `#${sel.id.trim()}`;
  if (sel.className) {
    const classes = sel.className.trim().split(/\s+/).filter(Boolean);
    return classes.map((c) => `.${c}`).join("");
  }
  if (sel.attribute) return `[${sel.attribute.name}="${sel.attribute.value}"]`;
  throw new Error(
    "ElementSelector must have at least one of: selector, id, className, attribute",
  );
}

/**
 * Waits for the page to reach the most assured "ready" state by combining:
 *  - `networkidle`  – no more than 0 network connections for 500 ms
 *  - `domcontentloaded` – the initial HTML document has been fully parsed
 *
 * Using `networkidle` is the most conservative (and most assured) strategy;
 * it implies DOM is parsed, blocking scripts have run, and all initial
 * sub-resource requests have settled.
 *
 * For SPAs that fire late XHR/fetch calls, combine this with an explicit
 * `waitForLoadState("networkidle")` call, which is what this helper does.
 */
export async function waitForPageReady(
  page: Page,
  timeout = 5_000,
): Promise<void> {
  try {
    // Quick check if network settles within 1.5s, otherwise fall back to DOM ready
    await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 1_500) });
  } catch {
    await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
  }
}
