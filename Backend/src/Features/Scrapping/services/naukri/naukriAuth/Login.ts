import { Page } from "playwright";
import { typeIntoField } from "../../../utility/playwright/interactions/typeIntoField.js";

export default async function loginToNaukri(page: Page): Promise<void> {
  await typeIntoField(page, { id: "usernameField" },"");
}