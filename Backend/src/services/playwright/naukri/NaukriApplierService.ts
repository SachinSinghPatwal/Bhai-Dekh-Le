import { BrowserManager } from '../BrowserManager.js';
import { StorageStateManager } from '../StorageStateManager.js';
import { Page } from 'playwright';
import {
  writeTempStorageState,
  removeTempStorageState,
} from '../../../utility/temp-storage-state.js';
import logger from '../../../utility/logger.js';
import { extractUserResumeText } from '../../../utility/resume-text.js';
import { User } from '../../../models/Mongo/user.models.js';
import { JobModel } from '../../../models/Mongo/job.models.js';
import { GeminiMatchingService } from '../../gemini/GeminiMatchingService.js';

/**
 * Applies to jobs on Naukri.com
 */
export class NaukriApplierService {
  private browserManager: BrowserManager;
  private storageStateManager: StorageStateManager;
  private geminiService: GeminiMatchingService;

  constructor() {
    this.browserManager = new BrowserManager();
    this.storageStateManager = new StorageStateManager();
    this.geminiService = new GeminiMatchingService();
  }

  /**
   * Apply to jobs that match criteria
   */
  async applyToJobs(
    userId: string,
    threshold: number = 70
  ): Promise<{ applied: number; skipped: number; failed: number }> {
    let page: Page | null = null;
    let tempStatePath: string | null = null;
    const result = { applied: 0, skipped: 0, failed: 0 };

    try {
      logger.info('Starting job application process', { userId, threshold });

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check auth
      if (!user.naukriStorageState) {
        throw new Error('No authentication found. Please authenticate first.');
      }

      // Get pending jobs from database
      const pendingJobs = await JobModel.find({
        userId,
        applicationStatus: 'pending',
        platform: 'naukri',
      });

      logger.info(`Found ${pendingJobs.length} pending jobs`);

      if (pendingJobs.length === 0) {
        return result;
      }

      // Load storage state
      const storageState = this.storageStateManager.decryptFromDB(
        user.naukriStorageState
      );

      // Launch browser
      await this.browserManager.launch({ headless: false });
      // Temp session file lives in the OS temp dir and is removed in `finally`.
      tempStatePath = writeTempStorageState(userId, storageState);

      await this.browserManager.createContext({
        storageStatePath: tempStatePath,
      });

      page = await this.browserManager.newPage();

      // Get resume text for Gemini matching (cloud copy preferred, local fallback)
      const resumeText = await extractUserResumeText(user.resume);

      if (!resumeText) {
        logger.warn('No resume found, matching will be less accurate');
      }

      // Process each job
      for (const job of pendingJobs) {
        try {
          // Rate job with Gemini
          const matchResult = await this.geminiService.rateJobMatch(
            resumeText,
            job.title,
            job.description,
            threshold
          );

          // Update job with Gemini score
          await JobModel.findByIdAndUpdate(job._id, {
            $set: {
              geminiScore: matchResult.score,
              geminiReasoning: matchResult.reasoning,
            },
          });

          if (!matchResult.shouldApply) {
            await JobModel.findByIdAndUpdate(job._id, {
              $set: { applicationStatus: 'skipped' },
            });
            result.skipped++;
            logger.info(`Skipped job: ${job.title}`, {
              score: matchResult.score,
            });
            continue;
          }

          // Navigate to job and apply
          const applied = await this.applyToSingleJob(page, job.staticLink);

          if (applied) {
            await JobModel.findByIdAndUpdate(job._id, {
              $set: {
                applicationStatus: 'applied',
                appliedAt: new Date(),
              },
            });
            result.applied++;
            logger.info(`Applied to job: ${job.title}`);
          } else {
            await JobModel.findByIdAndUpdate(job._id, {
              $set: { applicationStatus: 'failed' },
            });
            result.failed++;
          }

          // Random delay between applications
          await this.randomDelay(2000, 5000);
        } catch (error) {
          logger.error(`Failed to process job: ${job.title}`, { error });
          result.failed++;
        }
      }

      logger.info('Job application process completed', result);
      return result;
    } catch (error) {
      logger.error('Job application process failed', { error, userId });
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
   * Apply to a single job
   */
  private async applyToSingleJob(
    page: Page,
    jobUrl: string
  ): Promise<boolean> {
    try {
      await page.goto(jobUrl, { waitUntil: 'networkidle' });

      // Check for "Apply" button
      const applyButton = await page.$('button:has-text("Apply")');

      if (!applyButton) {
        logger.debug('No apply button found');
        return false;
      }

      await applyButton.click();
      await page.waitForTimeout(2000);

      // Check if it's an external redirect
      const isExternal = await this.checkIfExternalApplication(page);

      if (isExternal) {
        logger.info('External application detected, marking as failed');
        return false;
      }

      // Handle Easy Apply flow if exists
      const easyApplySuccess = await this.handleEasyApplyFlow(page);

      return easyApplySuccess;
    } catch (error) {
      logger.error('Failed to apply to job', { error, jobUrl });
      return false;
    }
  }

  /**
   * Check if application redirects to external site
   */
  private async checkIfExternalApplication(page: Page): Promise<boolean> {
    try {
      const externalIndicator = await page.$(
        'text=/apply on company website/i'
      );
      return !!externalIndicator;
    } catch {
      return false;
    }
  }

  /**
   * Handle Naukri Easy Apply flow
   */
  private async handleEasyApplyFlow(page: Page): Promise<boolean> {
    try {
      // Wait for apply modal/dialog
      await page.waitForSelector('.apply-modal', { timeout: 5000 }).catch(() => null);

      // Fill required fields (simplified - would need more sophisticated logic)
      const submitButton = await page.$('button[type="submit"]');

      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Random delay to avoid detection
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
