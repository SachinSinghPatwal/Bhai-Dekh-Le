/**
 * Playwright interaction helpers for authentication and account workflows.
 *
 * Usage:
 *   import { clickButton, typeIntoField } from "./interactions/index.js";
 */

export type { ElementSelector, WaitOptions } from "./types.js";
export { resolveSelector, waitForPageReady } from "./utils.js";
export { clickButton } from "./clickButton.js";
export type { ClickOptions } from "./clickButton.js";
export type { TypeOptions } from "./typeIntoField.js";
export { typeIntoField } from "./typeIntoField.js";
