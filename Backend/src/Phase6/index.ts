import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
  slowMo: 1000,
});

const context = await browser.newContext();

const page = await context.newPage();

// await page.getByRole("button", { name: "Search" }).click();

// await page.getByLabel("Email").fill("dev@example.com");

// const input = page.getByLabel("Email");

// await input.type("hello");

// await page.getByLabel("Search").press("Enter");

// await page.getByLabel("Name").press("Tab");

// await page.locator("input").press("Control+A");

// await page.getByLabel("I agree").check();

// await page.locator("select").selectOption("bca");

// await page.getByText("Profile").hover();

// await page.getByLabel("Email").focus();

// await page.keyboard.press("Escape");

// await page.mouse.click(500, 300);

// await page.locator("#job-description").scrollIntoViewIfNeeded();

// // await source.dragTo(target);

// await page.getByText("Document").dblclick();

// await page.getByText("File").click({ button: "right" });

// await page.getByLabel("Full Name").fill("Sachin");
// await page.getByLabel("Email").fill("dev@example.com");

// await page.getByLabel("Experience").selectOption({ label: "1–2 years" });

// await page.getByLabel("Willing to relocate").check();

// await page.getByRole("button", { name: "Submit Application" }).click();

// await page.getByRole("status").waitFor();

// console.log("Application submitted successfully");

// await browser.close();


await page.goto("http://localhost:5173/");

// ======================================================
// 1. HOVER
// ======================================================

console.log("1. Hover");

await page.getByRole("button", { name: "Profile" }).hover();


// ======================================================
// 2. FOCUS
// ======================================================

console.log("2. Focus");

const focusInput = page.getByLabel("Focus Input");

await focusInput.focus();


// ======================================================
// 3. BLUR
// ======================================================

console.log("3. Blur");

await focusInput.blur();


// ======================================================
// 4. KEYBOARD
// ======================================================

console.log("4. Keyboard");

const keyboardInput = page.getByLabel("Keyboard Input");

await keyboardInput.focus();

await page.waitForTimeout(1000);

await keyboardInput.press("Enter");


await keyboardInput.press("Escape");


// ======================================================
// 5. DOUBLE CLICK
// ======================================================

console.log("5. Double click");

await page.getByRole("button", { name: "Double Click Me" }).dblclick();


// ======================================================
// 6. RIGHT CLICK
// ======================================================

console.log("6. Right click");

await page.getByRole("button", { name: "Right Click Me" }).click({
  button: "right",
});


// ======================================================
// 7. MODIFIER KEY
// ======================================================

console.log("7. Ctrl + Click");

await page.getByRole("button", { name: "Modifier Button" }).click({
  modifiers: ["Control"],
});


// ======================================================
// 8. DRAG & DROP
// ======================================================

console.log("8. Drag and drop");

const job = page.getByText("Job A", { exact: true });
const dropZone = page.getByText("Drop Job Here", { exact: true });

await job.dragTo(dropZone);


// ======================================================
// 9. SCROLL
// ======================================================

console.log("9. Scroll");

const bottomButton = page.getByRole("button", {
  name: "Bottom Button",
});

await bottomButton.scrollIntoViewIfNeeded();


// ======================================================
// 10. CLICK AFTER SCROLL
// ======================================================

console.log("10. Click bottom button");

await bottomButton.click();


// ======================================================
// END
// ======================================================

await browser.close();