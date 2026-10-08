import { Page } from "playwright";
import { closeObstacles } from "../../../utility/playwright/interactions/closeObstacles.js";
import { typeIntoField } from "../../../utility/playwright/interactions/typeIntoField.js";

export default async function searchSkillsAndKeywords(
  page: Page,
  skill: string,
) {
  try {
    /**
     * @description closing any drawer or pop up from the screen
     * */
    await closeObstacles(page);
    await typeIntoField(page, { id: "usernameField" }, skill, {
      humanDelay: 70,
    });
  } catch (error) {
    throw new Error("Something went wrong while searching keyword");
  }
}
