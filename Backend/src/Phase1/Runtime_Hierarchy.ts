import { chromium } from "playwright";

// const browser = await chromium.launch({ headless: false });

// const contextA = await browser.newContext();
// const contextB = await browser.newContext();

// // cookies
// await contextA.addCookies([
//   {
//     name: "user",
//     value: "Alice",
//     domain: "example.com",
//     path: "/",
//   },
// ]);

// console.log("context A:", await contextA.cookies());
// console.log("context B:", await contextB.cookies());

// const pageA = await contextA.newPage();
// const pageB = await contextB.newPage();

// await pageA.goto("https://www.Google.com");
// await pageB.goto("https://www.youtube.com");

// // console.log("Page A:", await pageA.title());
// // console.log("Page B:", await pageB.title());
// console.log("Page A:", await pageA.context().cookies());
// console.log("Page B:", await pageB.context().cookies());

// await pageA.waitForTimeout(10000); // Wait for 10 seconds to observe the pages
// await pageB.waitForTimeout(10000); // Wait for 10 seconds to observe the pages

// await browser.close();

/**********     Page LifeCycle    ********/

// const browser = await chromium.launch({ headless: false });

// const context = await browser.newContext();

// const page = await context.newPage();

// await page.goto("https://youtube.com");

// console.log("Before close:", page.url());

// await page.close();

// console.log("After close");
// console.log("Page closed:", page.isClosed());

// await browser.close();


/**********     Frames   ********/
const browser = await chromium.launch({ headless: false });

const context = await browser.newContext();

const page = await context.newPage();

await page.setContent(`
  <h1>Main Page</h1>

  <iframe src="https://example.com"></iframe>
`);

console.log("Frames:", page.frames().length);

await browser.close();