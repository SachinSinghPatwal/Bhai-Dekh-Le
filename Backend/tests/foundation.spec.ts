import { expect, test } from "@playwright/test";

// fixture = global var , browser
test("opening google", async ({ page }) => {
  await page.goto("https://www.google.com");
  console.log(await page.title());
  await expect(page).toHaveTitle("Google");
});

/*
 * -g for particular test
 * --project= for particular browser
 * --headed for view
 * --ui for ui
 * --debug for debug
 */
