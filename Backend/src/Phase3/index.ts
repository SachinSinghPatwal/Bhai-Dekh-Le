import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
});

const context = await browser.newContext();

const page = await context.newPage();

page.on("load", async () => {
  console.log(await page.title());
});

await page.goto("https://youtube.com#about", { timeout: 5000 });
await page.goto("https://linkedin.com");
await page.reload();
await page.goBack();
await page.goForward();

console.log(page.url());

await browser.close();
