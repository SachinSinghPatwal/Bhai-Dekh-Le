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
export { CheckForElement, checkForElement } from "./CheckForElement.js";
export type { CheckElementOptions, ElementState } from "./CheckForElement.js";
export { editPhoneInputField } from "./editPhoneInputField.js";
export type { EditPhoneOptions, EditPhoneResult } from "./editPhoneInputField.js";
