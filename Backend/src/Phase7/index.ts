import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
});

const context = await browser.newContext();
const page = await context.newPage();

await page.setContent(`
  <h1>Main Page</h1>

  <iframe
    id="payment-frame"
    srcdoc="
      <h2>Payment</h2>
      <input id='card' placeholder='Card Number'>
      <button id='pay'>Pay</button>
    "
  ></iframe>
`);

const paymentFrame = page.frameLocator("#payment-frame");

await paymentFrame.locator("#card").fill("123456789");

await paymentFrame.locator("#pay").click();

console.log(page.frames());

for (const frame of page.frames()) {
  console.log(frame.url());
}

await page.waitForTimeout(2000);


/*                          NEW TAB                          */
const newPagePromise = context.waitForEvent("page");
context.on("page", (page) => {
  console.log("New page created");
  console.log(page.url());
});
await page.setContent(`
  <button id="open">Open Tab</button>
  
  <script>
  document.querySelector("#open").onclick = () => {
    window.open("https://example.com", "_blank");
    };
  </script>
`);

await page.locator("#open").click();

const newPage = await newPagePromise;

await newPage.waitForTimeout(2000);

await browser.close();