import { BrowserManager } from '../BrowserManager.js';
import { StorageStateManager } from '../StorageStateManager.js';
import { Page } from 'playwright';
import {
  writeTempStorageState,
  removeTempStorageState,
} from '../../../utility/temp-storage-state.js';
import logger from '../../../utility/logger.js';
import { User } from '../../../models/Mongo/user.models.js';
import { JobModel } from '../../../models/Mongo/job.models.js';
import { JobScrapeResult } from '../../../types/automation.types.js';

/**
 * Scrapes job listings from Naukri.com
 */
export class NaukriScraperService {
  private browserManager: BrowserManager;
  private storageStateManager: StorageStateManager;
  private baseUrl = 'https://www.naukri.com';

  constructor() {
    this.browserManager = new BrowserManager();
    this.storageStateManager = new StorageStateManager();
  }

  /**
   * Scrape jobs based on user preferences
   */
  async scrapeJobs(userId: string, maxJobs: number = 50): Promise<JobScrapeResult[]> {
    let page: Page | null = null;
    let tempStatePath: string | null = null;
    const scrapedJobs: JobScrapeResult[] = [];

    try {
      logger.info('Starting Naukri job scraping', { userId, maxJobs });

      // Get user and preferences
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Load storage state if available
      if (!user.naukriStorageState) {
        throw new Error('No authentication found. Please authenticate first.');
      }

      const storageState = this.storageStateManager.decryptFromDB(
        user.naukriStorageState
      );

      // Launch browser with saved state
      await this.browserManager.launch({ headless: false });

      // Write the decrypted session to a short-lived file for Playwright.
      tempStatePath = writeTempStorageState(userId, storageState);

      await this.browserManager.createContext({
        storageStatePath: tempStatePath,
      });

      page = await this.browserManager.newPage();

      // Build search URL from preferences
      const searchUrl = this.buildSearchUrl(user.jobPreferences);
      await page.goto(searchUrl, { waitUntil: 'networkidle' });
      logger.info('Navigated to search results', { searchUrl });

      // Scrape jobs from multiple pages
      let currentPage = 1;
      while (scrapedJobs.length < maxJobs) {
        const jobs = await this.scrapeJobsFromPage(page);
        scrapedJobs.push(...jobs);

        if (jobs.length === 0) {
          logger.info('No more jobs found');
          break;
        }

        // Check if next page exists
        const hasNextPage = await this.goToNextPage(page);
        if (!hasNextPage) {
          break;
        }

        currentPage++;
        logger.info(`Scraping page ${currentPage}`);
      }

      // Save jobs to database
      await this.saveJobsToDatabase(scrapedJobs, userId);

      logger.info('Job scraping completed', {
        totalJobs: scrapedJobs.length,
      });

      return scrapedJobs.slice(0, maxJobs);
    } catch (error) {
      logger.error('Job scraping failed', { error, userId });
      throw error;
    } finally {
      if (page) {
        await this.browserManager.close();
      }
      // Always remove the decrypted session file, including on failure.
      removeTempStorageState(tempStatePath);
    }
  }

  /**
   * Build Naukri search URL from preferences
   */
  private buildSearchUrl(preferences?: any): string {
    const keywords = preferences?.keywords?.join(' ') || 'software developer';
    const location = preferences?.locations?.[0] || 'remote';

    return `${this.baseUrl}/jobs/${encodeURIComponent(keywords)}-jobs-in-${encodeURIComponent(location)}?experience=1`;
  }

  /**
   * Scrape jobs from current page
   */
  private async scrapeJobsFromPage(page: Page): Promise<JobScrapeResult[]> {
    const jobs: JobScrapeResult[] = [];

    try {
      // Wait for job listings to load
      await page.waitForSelector('[data-job-id]', { timeout: 10000 });

      // Get all job cards
      const jobCards = await page.$$('[data-job-id]');
      logger.info(`Found ${jobCards.length} job cards on page`);

      for (const card of jobCards) {
        try {
          const job = await this.extractJobData(card);
          if (job) {
            jobs.push(job);
          }
        } catch (error) {
          logger.debug('Failed to extract job data from card', { error });
        }
      }

      return jobs;
    } catch (error) {
      logger.error('Failed to scrape jobs from page', { error });
      return [];
    }
  }

  /**
   * Extract job data from a job card element
   */
  private async extractJobData(card: any): Promise<JobScrapeResult | null> {
    try {
      const title = await card.$eval('a[title]', (el: any) => el.title).catch(() => '');
      const company = await card.$eval('.comp-name', (el: any) => el.textContent?.trim()).catch(() => '');
      const location = await card.$eval('.locWdth', (el: any) => el.textContent?.trim()).catch(() => '');
      const salary = await card.$eval('.sal', (el: any) => el.textContent?.trim()).catch(() => '');
      const link = await card.$eval('a[title]', (el: any) => el.href).catch(() => '');
      const description = await card.$eval('.job-desc', (el: any) => el.textContent?.trim()).catch(() => '');

      if (!title || !link) {
        return null;
      }

      // Parse salary (simple implementation - extract numbers)
      const salaryNum = this.parseSalary(salary);

      return {
        title,
        company: company || 'Not specified',
        location: location || 'Not specified',
        salary: salaryNum,
        description: description || '',
        staticLink: link,
        type: 'full-time', // Default, could be extracted
        employType: 'remote', // Default, could be extracted
        platform: 'naukri',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse salary string to number
   */
  private parseSalary(salaryStr: string): number {
    const numbers = salaryStr.match(/\d+/g);
    if (!numbers || numbers.length === 0) {
      return 0;
    }
    // Simple: take first number found (in lakhs)
    const num = parseInt(numbers[0]);
    return num * 100000; // Convert lakhs to actual value
  }

  /**
   * Navigate to next page of results
   */
  private async goToNextPage(page: Page): Promise<boolean> {
    try {
      const nextButton = await page.$('.styles-btn-secondary__2aIP0');
      if (nextButton) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save scraped jobs to database
   */
  private async saveJobsToDatabase(jobs: JobScrapeResult[], userId: string): Promise<void> {
    const jobDocs = jobs.map((job) => ({
      ...job,
      userId,
      applicationStatus: 'pending' as const,
      appliedAt: undefined,
    }));

    await JobModel.insertMany(jobDocs, { ordered: false });
    logger.info(`Saved ${jobs.length} jobs to database`);
  }
}
