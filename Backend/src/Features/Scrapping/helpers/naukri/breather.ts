import { SCRAPING_JITTER, Logger } from "../../index.js";

export default async function breather(
  currentPage: number,
  initialPage: number,
  workerId: string,
) {
  if (currentPage > initialPage) {
    // Periodic breather to reset Naukri's sliding rate-limit counter
    if (
      (currentPage - initialPage) % SCRAPING_JITTER.breatherIntervalPages ===
      0
    ) {
      const breather =
        Math.floor(Math.random() * SCRAPING_JITTER.breatherMaxJitter) +
        SCRAPING_JITTER.breatherBaseDelay;
      if (breather > 0) {
        Logger.debug(
          `[${workerId}] Periodic breather: Waiting ${(breather / 1000).toFixed(1)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, breather));
      }
    }

    // Jitter delay between paginated requests (controlled via constants/env)
    const pageJitter =
      Math.floor(Math.random() * SCRAPING_JITTER.paginationMaxJitter) +
      SCRAPING_JITTER.paginationBaseDelay;
    if (pageJitter > 0) {
      await new Promise((resolve) => setTimeout(resolve, pageJitter));
    }
  }
}
