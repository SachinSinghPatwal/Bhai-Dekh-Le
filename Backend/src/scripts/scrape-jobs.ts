import '../config/load-env.js';
import { NaukriScraperService } from '../services/playwright/naukri/NaukriScraperService.js';
import connectToMongoDb, { disconnectFromMongoDb } from '../db/MongoDb.js';
import { isMongoObjectId } from '../utility/user-id.js';
import logger from '../utility/logger.js';

/**
 * CLI script to scrape jobs from Naukri
 * Run: npm run automation:scrape -- <24-character-mongodb-user-id> [maxJobs]
 */
async function main() {
  try {
    const userId = process.argv[2];
    const maxJobs = parseInt(process.argv[3]) || 50;

    if (!userId) {
      console.error('Usage: npm run automation:scrape -- <userId> [maxJobs]');
      process.exit(1);
    }

    if (!isMongoObjectId(userId)) {
      console.error(
        "Invalid user ID. Pass the user's MongoDB _id (a 24-character hexadecimal value)."
      );
      process.exit(1);
    }

    logger.info('Starting Naukri job scraping CLI', { userId, maxJobs });

    // The scraper reads user preferences and writes jobs, so the connection
    // must be open before it runs.
    await connectToMongoDb();

    const scraperService = new NaukriScraperService();
    const jobs = await scraperService.scrapeJobs(userId, maxJobs);

    await disconnectFromMongoDb();

    console.log(`✓ Scraping completed!`);
    console.log(`✓ Found and saved ${jobs.length} jobs`);
    process.exit(0);
  } catch (error) {
    logger.error('CLI error', { error });
    console.error('Error:', error);
    await disconnectFromMongoDb().catch(() => undefined);
    process.exit(1);
  }
}

main();
