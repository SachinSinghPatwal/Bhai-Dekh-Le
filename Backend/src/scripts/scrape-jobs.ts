import { NaukriScraperService } from '../services/playwright/naukri/NaukriScraperService.js';
import logger from '../utility/logger.js';

/**
 * CLI script to scrape jobs from Naukri
 * Run: npm run automation:scrape <userId> [maxJobs]
 */
async function main() {
  try {
    const userId = process.argv[2];
    const maxJobs = parseInt(process.argv[3]) || 50;

    if (!userId) {
      console.error('Usage: npm run automation:scrape <userId> [maxJobs]');
      process.exit(1);
    }

    logger.info('Starting Naukri job scraping CLI', { userId, maxJobs });

    const scraperService = new NaukriScraperService();
    const jobs = await scraperService.scrapeJobs(userId, maxJobs);

    console.log(`✓ Scraping completed!`);
    console.log(`✓ Found and saved ${jobs.length} jobs`);
    process.exit(0);
  } catch (error) {
    logger.error('CLI error', { error });
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
