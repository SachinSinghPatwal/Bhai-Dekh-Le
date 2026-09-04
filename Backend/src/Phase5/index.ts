import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
});

const context = await browser.newContext();

const page = await context.newPage();

// await page.setContent(`
//   <style>
//     #apply {
//       position: absolute;
//       left: 0;
//       top: 100px;
//       animation: moveButton 3s linear;
//     }

//     @keyframes moveButton {
//       from {
//         left: 0px;
//       }

//       to {
//         left: 500px;
//       }
//     }
//   </style>

//   <button id="apply">Apply</button>
// `);

// await page.setContent(`
//   <style>
//     #apply {
//       position: absolute;
//       left: 100px;
//       top: 100px;
//     }

//     #overlay {
//       position: absolute;
//       left: 90px;
//       top: 90px;
//       width: 100px;
//       height: 50px;
//       background: rgba(0,0,0,0.3);
//     }
//   </style>

//   <button id="apply">Apply</button>
//   <div id="overlay"></div>
// `);


await page.setContent(`
  <button id="search">Search</button>

  <script>
    document.querySelector("#search").addEventListener("click", () => {
      fetch("/api/jobs")
        .then(() => console.log("response received"));
    });
  </script>
`);

const responsePromise = page.waitForResponse((response) =>
  response.url().includes("/api/"),
);

await page.getByRole("button", { name: "Search" }).click();

const response = await responsePromise;

console.log("Status:", response.status());

await browser.close();


/*
const requestPromise = page.waitForRequest(
  request => request.url().includes("/api/jobs")
);

await page.getByRole("button", { name: "Search" }).click();

const request = await requestPromise;

console.log(request.method());
console.log(request.url());
*/



/*
const pagePromise = context.waitForEvent("page");

await page.getByRole("link", { name: "Open" }).click();

const newPage = await pagePromise;
*/