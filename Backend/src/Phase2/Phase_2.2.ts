import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch();
  let context;

  if (fs.existsSync("auth.json")) {
    context = await browser.newContext({
      storageState: "auth.json",
    });
    console.log("Loaded storage state from auth.json");
  } else {
    context = await browser.newContext();
  }

  const cookies = await context.cookies();
  if (cookies.length === 0) {
    console.log("No cookies found.");
    await context.addCookies([
      {
        name: "session",
        value: "abc123",
        domain: "example.com",
        path: "/",
      },
    ]);
  }
  const state = await context.storageState({
    path: "auth.json",
  });

  console.log(state);

  await browser.close();
})();

// const browser = await chromium.launch();
// const context = await browser.newContext();

// const pageA = await context.newPage();

// await pageA.goto("https://example.com");

// await pageA.evaluate(() => {
//   sessionStorage.setItem("token", "abc123");
// });

// console.log(
//   "Page A:",
//   await pageA.evaluate(() => sessionStorage.getItem("token")),
// );

// const pageB = await context.newPage();

// await pageB.goto("https://example.com");

// console.log(
//   "Page B:",
//   await pageB.evaluate(() => sessionStorage.getItem("token")),
// );

// await browser.close();
