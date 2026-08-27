import { expect, test, type Locator } from "@playwright/test";

// location = identifier for element in the page while auto waiting and retry ability

/*
1.page.getByRole() to locate by explicit and implicit accessibility attributes.

2.page.getByText() to locate by text content.

3.page.getByLabel() to locate a form control by associated label's text.

4.page.getByPlaceholder() to locate an input by placeholder.

5.page.getByAltText() to locate an element, usually image, by its text alternative.

6.page.getByTitle() to locate an element by its title attribute.

7.page.getByTestId() to locate an element based on its data-testid attribute (other attributes can be configured).
*/

test("", async ({ page }) => {
  page.getByRole("button", { name: "Signin" });
});

test("Verify locators", async ({ page }) => {
  await page.goto("https://sliding.toys/mystic-square/8-puzzle/daily/");
  // const Logo: Locator = page.getByAltText("nopCommerce demo store");

  // await expect(Logo).toBeVisible();
  await expect(page.getByText(/SLIDING\s+TOYS/i)).toBeVisible();

  // await expect(page.getByRole("button", { name: /Reset/i }).click());
  
});
