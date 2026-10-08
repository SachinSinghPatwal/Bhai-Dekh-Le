import { Page } from "playwright";
import {
  clickButton,
  closeObstacles,
  typeIntoField,
  waitForPageReady,
} from "../../../utility/playwright/interactions/index.js";

const SELECTORS = {
  searchExpand:
    ".nI-gNb-sb__expand, .nI-gNb-sb__placeholder, #ni-gnb-searchbar, .nI-gNb-sb__main",
  suggestorInput: ".suggestor-input",
  searchSubmit: ".nI-gNb-sb__icon-wrapper, button[aria-label='Search']",
  sortButton:
    "#filter-sort, .styles_sort-droop-label__TxC3K, .styles_ss__menu-btn__4s9fF",
  sortMenu:
    "ul[data-filter-id='sort'], .styles_sort-droop-list__BmFFW, .styles_ss__menu_9TuCu",
  dateSortOption:
    "li.styles_ss__menu-item__T4rgB[title='Date'], a[data-id='filter-sort-f'], li[title='Date']",
} as const;

/**
 * Ensures the search bar is expanded and the suggestor input is ready.
 */
async function expandSearchBar(page: Page): Promise<void> {
  const input = page.locator(SELECTORS.suggestorInput).first();
  if (await input.isVisible()) return;

  await clickButton(
    page,
    { selector: SELECTORS.searchExpand },
    { force: true, timeout: 5_000 },
  ).catch(() => {});

  await page
    .evaluate((selector) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      el?.click();
    }, SELECTORS.searchExpand)
    .catch(() => {});

  await input.waitFor({ state: "attached", timeout: 8_000 }).catch(() => {});
}

/**
 * Submits the current search and waits for the search results page to load.
 */
async function submitSearch(page: Page): Promise<void> {
  const submitBtn = page.locator(SELECTORS.searchSubmit).first();
  if (await submitBtn.isVisible()) {
    await clickButton(
      page,
      { selector: SELECTORS.searchSubmit },
      { force: true },
    );
  } else {
    await page.keyboard.press("Enter");
  }

  await page
    .waitForURL((url) => !url.href.includes("homepage"), { timeout: 15_000 })
    .catch(() => {});
  await waitForPageReady(page);
}

/**
 * Opens the sort dropdown menu and selects the specified sort option (defaults to Date).
 */
async function selectSortOption(
  page: Page,
  optionSelector: string = "li[title='Date'], a[data-id='filter-sort-f']",
): Promise<void> {
  const sortBtn = page.locator("#filter-sort").first();
  await sortBtn.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(500);

  // Click sort button once to open the dropdown
  await sortBtn.click({ force: true });
  await page.waitForTimeout(1_000);

  const dateOption = page.locator(optionSelector).first();
  if (!(await dateOption.isVisible())) {
    // Retry click if menu didn't open on first attempt
    await sortBtn.click({ force: true });
    await page.waitForTimeout(1_000);
  }

  await dateOption.waitFor({ state: "visible", timeout: 8_000 });
  await dateOption.click({ force: true });
}

/**
 * Searches for given skills and keywords on Naukri and sorts results by Date.
 *
 * @param page Playwright Page instance
 * @param keywords Array of keywords or single keyword string. Defaults to ["react"].
 */
export default async function searchSkillsAndKeywords(
  page: Page,
  keywords: string[] | string = ["react"],
): Promise<void> {
  const keywordList = Array.isArray(keywords)
    ? keywords.length > 0
      ? keywords
      : ["react"]
    : [keywords || "react"];

  for (const keyword of keywordList) {
    await closeObstacles(page);
    await expandSearchBar(page);
    await typeIntoField(
      page,
      { className: "suggestor-input" },
      keyword,
      { humanDelay: 100 },
    );
    await submitSearch(page);
    await selectSortOption(page);
  }
}
