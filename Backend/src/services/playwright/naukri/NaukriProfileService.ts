import { BrowserManager } from '../BrowserManager.js';
import { StorageStateManager } from '../StorageStateManager.js';
import { Page } from 'playwright';
import fs from 'fs';
import {
  writeTempStorageState,
  removeTempStorageState,
} from '../../../utility/temp-storage-state.js';
import logger from '../../../utility/logger.js';
import { User } from '../../../models/Mongo/user.models.js';

/**
 * Handles Naukri profile updates
 * Uploads tailored resume to profile section
 */
export class NaukriProfileService {
  private browserManager: BrowserManager;
  private storageStateManager: StorageStateManager;
  private profileUrl = 'https://www.naukri.com/mnjuser/profile';

  constructor() {
    this.browserManager = new BrowserManager();
    this.storageStateManager = new StorageStateManager();
  }

  /**
   * Upload resume to Naukri profile
   * Navigates to profile section and uploads the file
   */
  async uploadResumeToProfile(
    userId: string,
    resumePath: string
  ): Promise<{ success: boolean; message: string }> {
    let page: Page | null = null;
    let tempStatePath: string | null = null;

    try {
      logger.info('Uploading resume to Naukri profile', { userId, resumePath });

      // Verify file exists
      if (!fs.existsSync(resumePath)) {
        throw new Error(`Resume file not found: ${resumePath}`);
      }

      // Get user auth
      const user = await User.findById(userId);
      if (!user || !user.naukriStorageState) {
        throw new Error('No authentication found');
      }

      // Decrypt storage state
      const storageState = this.storageStateManager.decryptFromDB(
        user.naukriStorageState
      );

      // Launch browser
      await this.browserManager.launch({ headless: false });

      // Decrypted session goes to a short-lived file in the OS temp dir and is
      // removed in `finally`.
      tempStatePath = writeTempStorageState(userId, storageState);

      await this.browserManager.createContext({
        storageStatePath: tempStatePath,
      });

      page = await this.browserManager.newPage();

      // Navigate to profile
      await page.goto(this.profileUrl, { waitUntil: 'networkidle' });
      logger.info('Navigated to Naukri profile');

      // Find resume upload section
      const uploadButton = await page.$('input[type="file"][accept=".pdf,.doc,.docx"]');

      if (!uploadButton) {
        // Try alternative selectors
        const altUpload = await page.$('[data-testid="resume-upload"]') ||
                          await page.$('.resume-upload input') ||
                          await page.$('input[name="resume"]');

        if (!altUpload) {
          throw new Error('Resume upload button not found on profile page');
        }

        await altUpload.setInputFiles(resumePath);
      } else {
        await uploadButton.setInputFiles(resumePath);
      }

      logger.info('Resume file uploaded');

      // Wait for upload to complete
      await page.waitForTimeout(3000);

      // Save updated profile
      const saveButton = await page.$('button:has-text("Save")') ||
                        await page.$('[type="submit"]');

      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }

      // Cleanup
      logger.info('Resume uploaded to Naukri profile successfully');

      return {
        success: true,
        message: 'Resume uploaded to profile successfully',
      };
    } catch (error) {
      logger.error('Failed to upload resume to profile', { error, userId });
      return {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    } finally {
      if (page) {
        await this.browserManager.close();
      }
      // Always remove the decrypted session file, including on failure.
      removeTempStorageState(tempStatePath);
    }
  }

  /**
   * Update profile headline and summary
   */
  async updateProfileSummary(
    userId: string,
    headline: string,
    summary: string
  ): Promise<boolean> {
    let page: Page | null = null;
    let tempStatePath: string | null = null;

    try {
      logger.info('Updating Naukri profile summary');

      const user = await User.findById(userId);
      if (!user || !user.naukriStorageState) {
        throw new Error('No authentication found');
      }

      const storageState = this.storageStateManager.decryptFromDB(
        user.naukriStorageState
      );

      await this.browserManager.launch({ headless: false });

      // Decrypted session goes to a short-lived file in the OS temp dir and is
      // removed in `finally`.
      tempStatePath = writeTempStorageState(userId, storageState);

      await this.browserManager.createContext({
        storageStatePath: tempStatePath,
      });

      page = await this.browserManager.newPage();
      await page.goto(this.profileUrl, { waitUntil: 'networkidle' });

      // Update headline
      const headlineInput = await page.$('input[name="headline"]') ||
                           await page.$('#headline');

      if (headlineInput) {
        await headlineInput.fill('');
        await headlineInput.fill(headline);
      }

      // Update summary
      const summaryInput = await page.$('textarea[name="summary"]') ||
                          await page.$('#summary');

      if (summaryInput) {
        await summaryInput.fill('');
        await summaryInput.fill(summary);
      }

      // Save changes
      const saveButton = await page.$('button:has-text("Save")');
      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }

      logger.info('Profile summary updated');

      return true;
    } catch (error) {
      logger.error('Failed to update profile summary', { error });
      return false;
    } finally {
      if (page) {
        await this.browserManager.close();
      }
      // Always remove the decrypted session file, including on failure.
      removeTempStorageState(tempStatePath);
    }
  }
}
