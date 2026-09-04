import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
});

const context = await browser.newContext();

const page = await context.newPage();

await page.goto("https://example.com");

console.log(await page.locator("h1").textContent());

/*
page.locator("button");                 
page.getByRole("button", { name: "Apply" });
page.getByText("Apply Now");
page.getByLabel("Email");
page.getByPlaceholder("Enter email");
page.getByTestId("apply-button");
*/

/*

const job = page.locator("article").filter({
  hasText: "Frontend Developer",
});

const apply = job.getByRole("button", { name: "Apply" });

*/

await browser.close();
