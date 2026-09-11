import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
});

const context = await browser.newContext();

export default async function Scraper() {
  const page = await context.newPage();

  page.on("request", async (request) => {
    if (!request.url().includes("/jobapi/v3/search")) {
      return;
    }
    const url = new URL(request.url());

    console.log("\n========== CAPTURED REQUEST ==========");

    const capturedHeaders = await request.allHeaders();

    console.log("header Pseudo Removale");

    // Remove HTTP/2 pseudo-headers:
    // :authority, :method, :path, :scheme
    const headers: Record<string, string> = Object.fromEntries(
      Object.entries(capturedHeaders).filter(([name]) => !name.startsWith(":")),
    );

    console.log("\n========== HTTP REQUEST ==========");

    try {
      for (let i = 1; i < 5; i++) {
        url.searchParams.set("noOfResults", "20");
        url.searchParams.set("pageNo", `${i}`);
        console.log("\nHEADERS Injection count :", i);
        const response = await fetch(url, {
          method: request.method(),
          headers,
        });

        console.log("STATUS:", response.status);

        const body = await response.json();

        console.log("\nBODY:");
        const data = body.jobDetails.map((each: Record<string, unknown>) => ({
          [each.title as string]: each.footerPlaceholderLabel,
        }));
        console.log(data);
        return data
      }
      return;
    } catch (error) {
      console.error("HTTP REQUEST FAILED:");
      console.error(error);
    }
  });

  await page.goto("https://www.naukri.com/react-jobs?k=react");

  await page.waitForTimeout(10000);

  await browser.close();
}