/**
 * A flexible element selector that accepts any combination of
 * CSS id, class, attribute, or an arbitrary CSS selector string.
 *
 * Priority resolution order (first truthy wins):
 *   1. `selector`  – raw CSS / XPath / text= selector (highest priority)
 *   2. `id`        – maps to  #<id>
 *   3. `className` – maps to  .<className>  (first class only)
 *   4. `attribute` – maps to  [<name>="<value>"]
 */
export interface ElementSelector {
  /** Raw Playwright-compatible selector string, e.g. `"button[type='submit']"` */
  selector?: string;
  /** Element id attribute value, e.g. `"submit-btn"` → resolves to `"#submit-btn"` */
  id?: string;
  /** CSS class name (single class without the dot), e.g. `"btn-primary"` → `".btn-primary"` */
  className?: string;
  /** Arbitrary attribute key/value pair, e.g. `{ name: "data-testid", value: "login" }` */
  attribute?: { name: string; value: string };
}

/** Options controlling how long to wait and how to handle timeouts */
export interface WaitOptions {
  /**
   * Maximum time in milliseconds to wait for page readiness / element visibility.
   * Defaults to 30_000 ms.
   */
  timeout?: number;
}
