import { Page, Frame, Locator } from "playwright";
import { ElementSelector, WaitOptions } from "./types.js";
import { resolveSelector, waitForPageReady } from "./utils.js";

/**
 * State to check for on the target element.
 * - `"visible"`  – Element is attached to the DOM and visually rendered (bounding box > 0, not hidden).
 * - `"attached"` – Element is present in the DOM tree (may or may not be visible).
 * - `"detached"` – Element is removed or absent from the DOM tree.
 * - `"hidden"`   – Element is either absent from DOM or hidden (e.g. display: none, opacity: 0).
 */
export type ElementState = "attached" | "detached" | "visible" | "hidden";

/**
 * Options controlling how `CheckForElement` searches and waits for elements.
 */
export interface CheckElementOptions extends WaitOptions {
  /**
   * The element lifecycle state to verify.
   * Defaults to `"visible"`.
   */
  state?: ElementState;

  /**
   * Optional text or RegExp that the target element must contain.
   */
  hasText?: string | RegExp;

  /**
   * Whether to wait for the page network and DOM readiness before checking.
   * Defaults to `false` for fast, lightweight checks.
   */
  waitForPage?: boolean;

  /**
   * Maximum time in milliseconds to wait for page readiness if `waitForPage` is enabled.
   * Defaults to `3_000` ms.
   */
  pageTimeout?: number;
}

/**
 * Resolves an ElementSelector or raw string into a clean CSS/Playwright selector string.
 * Returns null if the target cannot be resolved.
 */
function resolveTargetSelector(target: ElementSelector | string): string | null {
  if (typeof target === "string") {
    const trimmed = target.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!target || typeof target !== "object") {
    return null;
  }

  try {
    return resolveSelector(target);
  } catch {
    return null;
  }
}

/**
 * Checks whether an element matching the provided selector and options exists on the page.
 *
 * Always returns a boolean (`true` or `false`) and never throws errors when elements
 * are not found or time out.
 *
 * Matches the pattern used by other Playwright interaction utilities (`clickButton`, `typeIntoField`),
 * accepting an {@link ElementSelector} or raw selector string, supporting state verification
 * (`"visible"`, `"attached"`, `"detached"`, `"hidden"`), and using `.first()` to avoid strict mode violations.
 *
 * @param context - Playwright {@link Page}, {@link Frame}, or parent {@link Locator}.
 * @param target  - Selector describing the element (`ElementSelector` object or CSS/XPath string).
 * @param options - Searching options including state, timeout, text filter, and page readiness.
 * @returns `true` if the element matches the specified state within the timeout; otherwise `false`.
 *
 * @example
 * // Check if submit button is visible within default 5s
 * const isSubmitVisible = await CheckForElement(page, { id: "submit-btn" });
 *
 * // Instant check without waiting (timeout: 0)
 * const hasError = await CheckForElement(page, { className: "error-banner" }, { timeout: 0 });
 *
 * // Check if element is attached in DOM (even if hidden)
 * const isAttached = await CheckForElement(page, { attribute: { name: "data-testid", value: "job-row" } }, { state: "attached" });
 *
 * // Check with raw string selector and text filtering
 * const hasApplyButton = await CheckForElement(page, "button", { hasText: "Apply Now", timeout: 3_000 });
 *
 * // Check for an image by alt attribute
 * const hasAvatar = await CheckForElement(page, { alt: "User avatar" });
 *
 * // Check for an image by partial or full src URL
 * const hasLogo = await CheckForElement(page, { src: "company-logo.png" });
 *
 * // Check for an image by role and alt combination
 * const hasBadge = await CheckForElement(page, { role: "img", alt: "Verified Employer" });
 */
export async function CheckForElement(
  context: Page | Frame | Locator,
  target: ElementSelector | string,
  options: CheckElementOptions = {},
): Promise<boolean> {
  const {
    timeout = 5_000,
    state = "visible",
    hasText,
    waitForPage = false,
    pageTimeout = 3_000,
  } = options;

  // Basic sanity check on context
  if (!context) {
    return false;
  }

  // If context is a Page and is already closed, fail safely
  if (
    "isClosed" in context &&
    typeof (context as Page).isClosed === "function" &&
    (context as Page).isClosed()
  ) {
    return false;
  }

  const cssSelector = resolveTargetSelector(target);
  if (!cssSelector) {
    return false;
  }

  // Optionally wait for page readiness if caller explicitly requested it
  if (waitForPage && "waitForLoadState" in context) {
    try {
      await waitForPageReady(context as Page, pageTimeout);
    } catch {
      // If page readiness check fails, continue with element check
    }
  }

  try {
    const locatorOptions = hasText !== undefined ? { hasText } : undefined;
    const locator = context.locator(cssSelector, locatorOptions).first();

    // Instant check: When timeout is 0, avoid calling locator.waitFor (in Playwright, timeout: 0 means no timeout / wait forever)
    if (timeout === 0) {
      if (state === "visible") {
        return await locator.isVisible();
      }
      if (state === "hidden") {
        return !(await locator.isVisible());
      }
      const count = await locator.count();
      if (state === "attached") {
        return count > 0;
      }
      if (state === "detached") {
        return count === 0;
      }
    }

    // Wait-based check using Playwright's locator.waitFor
    await locator.waitFor({ state, timeout });
    return true;
  } catch {
    return false;
  }
}

export const checkForElement = CheckForElement;
export default CheckForElement;
