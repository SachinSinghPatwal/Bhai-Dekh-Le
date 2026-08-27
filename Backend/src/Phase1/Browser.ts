import { chromium, firefox, webkit } from "playwright";

const Brave = await chromium.launch({
  executablePath:
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  headless: false,
  slowMo: 500,
});
const firefoxBrowser = await firefox.launch({ headless: false });
const webkitBrowser = await webkit.launch({ headless: false });

const braveContext = await Brave.newContext();

const bravePage = await braveContext.newPage();

/***           localstorage           ***/
await bravePage.evaluate(() => {
  localStorage.setItem("user", "Alice");
});

await bravePage.goto("https://www.youtube.com/");

await bravePage.waitForTimeout(80000);

await Brave.close();
await firefoxBrowser.close();
await webkitBrowser.close();
