/**
 * Playwright interaction helpers – barrel export.
 *
 * Usage:
 *   import { clickButton, typeIntoField, selectDropdownOption, clickDropdownThenOption } from "./interactions/index.js";
 */

export type { ElementSelector, WaitOptions } from "./types.js";
export { resolveSelector, waitForPageReady } from "./utils.js";
export { clickButton } from "./clickButton.js";
export type { ClickOptions } from "./clickButton.js";
export { closeObstacles } from "./closeObstacles.js";
export type { DropdownOptions } from "./dropdown.js";
export { selectDropdownOption, clickDropdownThenOption } from "./dropdown.js";
export type { TypeOptions } from "./typeIntoField.js";
export { typeIntoField } from "./typeIntoField.js";
