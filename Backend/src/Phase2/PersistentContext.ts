import { chromium } from "playwright";
// (async () => {
//   const context = await chromium.launchPersistentContext("./profile");

//   const page = await context.newPage();

//   console.log("PID:", process.pid);
//   console.log("Context pages:", context.pages().length);
//   console.log("Browser version:", await context.browser()?.version());

//   await page.goto("chrome://version");

//   // await page.evaluate(() => {
//   //   localStorage.setItem("owner", "terminal-A");
//   // });

//   console.log(await page.evaluate(() => localStorage.getItem("owner")));

//   console.log("Browser is running.");

//   // Keep it alive
//   await new Promise(() => {});
// })();

(async () => {
  const context = await chromium.launchPersistentContext("./profile", {
    headless: true,
  });

  const page = await context.newPage();

  await page.goto("https://example.com");

  const existing = await page.evaluate(() => {
    return localStorage.getItem("job-applier-test");
  });

  console.log("Existing:", existing);

  if (!existing) {
    await page.evaluate(() => {
      localStorage.setItem("job-applier-test", "user-42");
    });

    console.log("Created session state");
  } else {
    console.log("Reused existing state");
  }

  await context.close();
})();
