// import { chromium, type Browser, type Page } from "playwright";
// import { chromium as chromiumExtra } from "playwright-extra";
// import stealth from "puppeteer-extra-plugin-stealth";
// import log from "../../../utility/Logger.js";
// import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";

// // Auth modules
// // import { naukriLogin } from "./naukriAuth/naukriLogin.js";
// // import { naukriRegister } from "./naukriAuth/naukriRegister.js";
// // import { checkLoginStatus } from "./naukriAuth/types.js";

// // Search modules
// // import { loadSearchConfig } from "./naukriSearch/loadSearchConfig.js";
// // import { searchByKeyword } from "./naukri/naukriSearch/searchByKeyword.js"; 
// // import { applyDateFilter } from "./naukriSearch/applyDateFilter.js";

// // Scraping modules
// // import { paginateAndScrape } from "./naukriScrape/paginateAndScrape.js";

// // Utility
// // import { deduplicateJobs } from "../utility/deduplicateJobs.js";

// // Enable stealth plugin
// chromiumExtra.use(stealth());

// /**
//  * Main orchestrator function for scraping recent jobs from Naukri.com
//  * Flow:
//  * 1. Login/Register with credentials from data/mockUserData.json
//  * 2. Search for keywords from data/skills.json and data/keywords.json
//  * 3. Apply date filter to sort by recent
//  * 4. Paginate through results until jobs are too old (gray or >3 days)
//  * 5. Return deduplicated job list
//  *
//  * @param workerId - Worker identifier for logging
//  * @returns Array of scraped job details
//  */
// export default async function scrapeRecentJobsFromWebsite(
//   workerId: string
// ): Promise<JOB_DETAILS[]> {
//   let browser: Browser | null = null;
//   let page: Page | null = null;

//   try {
//     log.info(`[${workerId}] Starting browser-based scraping`);

//     // Launch browser with stealth mode
//     browser = await chromiumExtra.launch({
//       headless: false, // HEADED MODE - see the browser
//       slowMo: 500, // 1 second delay between actions
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     page = await browser.newPage();

//     // Set user agent - use context method for playwright-extra compatibility
//     await page.context().setExtraHTTPHeaders({
//       "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
//     });

//     // ==========================
//     // PHASE 1: AUTHENTICATION
//     // ==========================

//     log.info(`[${workerId}] Phase 1: Authentication`);

//     // Navigate to Naukri homepage
//     await page.goto("https://www.naukri.com", {
//       waitUntil: "domcontentloaded",
//       timeout: 30000,
//     });

//     // Check if already logged in
//     let isLoggedIn = await checkLoginStatus(page);

//     if (!isLoggedIn) {
//       log.info(`[${workerId}] Not logged in, attempting login`);

//       // Try login
//       const loginResult = await naukriLogin(page);

//       if (!loginResult.success) {
//         if (loginResult.requiresRegistration) {
//           log.info(`[${workerId}] Login failed, attempting registration`);

//           // Try registration
//           const registerResult = await naukriRegister(page);

//           if (!registerResult.success) {
//             throw new Error(
//               `Authentication failed: ${registerResult.error || "Unknown error"}`
//             );
//           }
//         } else {
//           throw new Error(`Login failed: ${loginResult.error || "Unknown error"}`);
//         }
//       }

//       log.success(`[${workerId}] Authentication successful`);
//     } else {
//       log.success(`[${workerId}] Already logged in`);
//     }

//     // ==========================
//     // PHASE 2: SEARCH & SCRAPE
//     // ==========================

//     log.info(`[${workerId}] Phase 2: Search and Scrape`);

//     // Load search configuration
//     const { skills, keywords } = await loadSearchConfig();
//     const allSearchTerms = [...skills, ...keywords];

//     const allJobs: JOB_DETAILS[] = [];

//     for (let i = 0; i < allSearchTerms.length; i++) {
//       const searchTerm = allSearchTerms[i];

//       try {
//         log.info(`[${workerId}] Searching for: ${searchTerm} (${i + 1}/${allSearchTerms.length})`);

//         // Search with keyword
//         await searchByKeyword(page, searchTerm);

//         // Apply date filter
//         await applyDateFilter(page);

//         // Paginate and scrape jobs
//         const jobs = await paginateAndScrape(page);

//         allJobs.push(...jobs);

//         log.info(`[${workerId}] Found ${jobs.length} jobs for "${searchTerm}"`);

//         // Delay between searches to avoid rate limiting
//         if (i < allSearchTerms.length - 1) {
//           const delay = 3000 + Math.random() * 2000; // 3-5 seconds
//           log.info(`[${workerId}] Waiting ${Math.round(delay / 1000)}s before next search`);
//           await page.waitForTimeout(delay);
//         }
//       } catch (error) {
//         const errorMessage = error instanceof Error ? error.message : String(error);
//         log.error(`[${workerId}] Error searching for "${searchTerm}": ${errorMessage}`);
//         // Continue with next search term
//       }
//     }

//     // ==========================
//     // PHASE 3: DEDUPLICATION
//     // ==========================

//     log.info(`[${workerId}] Phase 3: Deduplication`);

//     const uniqueJobs = deduplicateJobs(allJobs);

//     log.success(
//       `[${workerId}] Scraping complete. Total: ${allJobs.length} jobs, Unique: ${uniqueJobs.length} jobs`
//     );

//     return uniqueJobs;
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     log.error(`[${workerId}] Scraping failed: ${errorMessage}`);
//     throw error;
//   } finally {
//     // Cleanup
//     if (page) {
//       await page.close().catch(() => {});
//     }
//     if (browser) {
//       await browser.close().catch(() => {});
//     }
//   }
// }
