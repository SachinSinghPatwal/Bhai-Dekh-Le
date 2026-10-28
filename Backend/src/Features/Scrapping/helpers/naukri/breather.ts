import { SCRAPING_JITTER, Logger, GENERAL_TIMEOUT } from "../../index.js";

export default async function breather(
  currentPage: number,
  initialPage: number,
  workerId: string,
) {
  if (currentPage > initialPage) {
    if (
      (currentPage - initialPage) % SCRAPING_JITTER.breatherIntervalPages ===
      0
    ) {
      const breather =
        Math.floor(Math.random() * GENERAL_TIMEOUT) + GENERAL_TIMEOUT;
      if (breather > 0) {
        await new Promise((resolve) => setTimeout(resolve, breather));
      }
    }

    const pageJitter = Math.floor(Math.random());
    if (pageJitter > 0) {
      await new Promise((resolve) => setTimeout(resolve, pageJitter));
    }
  }
}
