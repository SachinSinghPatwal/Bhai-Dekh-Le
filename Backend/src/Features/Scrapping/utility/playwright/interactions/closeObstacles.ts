import { Page } from "playwright";
import { clickButton } from "./clickButton.js";

export async function closeObstacles(page: Page) {
  const drawer = page.locator(".drawer-wrapper");

  if (await drawer.isVisible()) {
    await clickButton(page, { className: "Close" });
  } else {
    return;
  }
}
