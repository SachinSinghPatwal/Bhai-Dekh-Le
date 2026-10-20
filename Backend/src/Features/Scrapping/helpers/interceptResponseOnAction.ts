import { Page } from "playwright";
import {
  clickButton,
  type ElementSelector,
} from "../utility/playwright/interactions/index.js";

/**
 * Options controlling how responses are intercepted while executing an action.
 */
export interface InterceptResponseOptions {
  /** Target button to click (ElementSelector or raw string) */
  selector?: ElementSelector | string;
  /** Custom async action callback to execute (alternative to selector) */
  action?: () => Promise<void>;
  /** HTTP response status code to intercept (default: 401) */
  targetStatus?: number;
  /** Max time to wait for the target response status in ms (default: 10_000) */
  responseTimeout?: number;
  /** Target URL or filter function to wait for navigation */
  waitForUrl?: string | RegExp | ((url: URL) => boolean);
  /** Max time to wait for page navigation in ms (default: 30_000) */
  navigationTimeout?: number;
}

export type InterceptResult = "status_matched" | "navigated" | "timeout";

/**
 * Executes a browser action (such as clicking a submit button) while monitoring
 * network responses for a specific HTTP status code (e.g. 401 Unauthorized) and
 * racing against page navigation.
 *
 * @param page    - Active Playwright Page instance
 * @param options - Configuration for action, target status, and navigation
 * @returns `"status_matched"` if the target HTTP status was intercepted,
 *          `"navigated"` if page navigated away, or `"timeout"`.
 *
 * @example
 * const outcome = await interceptResponseOnAction(page, {
 *   selector: "#submit-btn",
 *   targetStatus: 401,
 *   waitForUrl: (url) => !url.href.includes("login"),
 * });
 *
 * if (outcome === "status_matched") {
 *   // Navigate to signup
 * }
 */
export async function interceptResponseOnAction(
  page: Page,
  options: InterceptResponseOptions,
): Promise<InterceptResult> {
  const {
    selector,
    action,
    targetStatus = 401,
    responseTimeout = 10_000,
    waitForUrl,
    navigationTimeout = 10_000,
  } = options;

  let isStatusReceived = false;
  const onResponse = (response: any) => {
    if (response.status() === targetStatus) {
      isStatusReceived = true;
    }
  };

  page.on("response", onResponse);

  try {
    const statusPromise = page
      .waitForResponse((res) => res.status() === targetStatus, {
        timeout: responseTimeout,
      })
      .then(() => "status_matched" as const)
      .catch(() => null);

    // Trigger the action (either custom callback or clickButton)
    if (action) {
      await action();
    } else if (selector) {
      const target: ElementSelector =
        typeof selector === "string" ? { selector } : selector;
      await clickButton(page, target, { timeout: responseTimeout });
    }

    const promises: Promise<any>[] = [statusPromise];

    if (waitForUrl) {
      const navPromise = page
        .waitForURL(waitForUrl, { timeout: navigationTimeout })
        .then(() => "navigated" as const)
        .catch(() => null);
      promises.push(navPromise);
    }

    const outcome = await Promise.race(promises);

    if (isStatusReceived || outcome === "status_matched") {
      return "status_matched";
    }

    if (outcome === "navigated") {
      return "navigated";
    }

    return "timeout";
  } finally {
    page.off("response", onResponse);
  }
}

export default interceptResponseOnAction;
