import { BrowserManager } from '../BrowserManager.js';
import { StorageStateManager } from '../StorageStateManager.js';
import { Page } from 'playwright';
import logger from '../../../utility/logger.js';
import { User } from '../../../models/Mongo/user.models.js';

/**
 * Handles Naukri.com authentication via manual login
 * Opens headed browser for user to login, then saves storageState
 */
export class NaukriAuthService {
  private browserManager: BrowserManager;
  private storageStateManager: StorageStateManager;
  private loginUrl = 'https://www.naukri.com/nlogin/login';

  constructor() {
    this.browserManager = new BrowserManager();
    this.storageStateManager = new StorageStateManager();
  }

  /**
   * Trigger manual authentication flow
   * Opens browser, waits for user to login, saves state to DB
   */
  async authenticate(userId: string): Promise<{ success: boolean; message: string }> {
    let page: Page | null = null;

    try {
      logger.info('Starting Naukri authentication', { userId });

      // Launch headed browser
      await this.browserManager.launch({ headless: false });
      page = await this.browserManager.newPage();

      // Navigate to login page
      await page.goto(this.loginUrl, { waitUntil: 'networkidle' });
      logger.info('Navigated to Naukri login page');

      // Wait for user to complete login (detect successful login)
      const loginSuccess = await this.waitForLoginSuccess(page);

      if (!loginSuccess) {
        return {
          success: false,
          message: 'Login timeout or cancelled by user',
        };
      }

      // Get storage state
      const storageState = await this.browserManager.getStorageState();

      // Encrypt and save to database
      const encryptedState = this.storageStateManager.encryptForDB(storageState);

      await User.findByIdAndUpdate(userId, {
        $set: { naukriStorageState: encryptedState },
      });

      logger.info('Naukri authentication successful', { userId });

      return {
        success: true,
        message: 'Authentication successful. Storage state saved.',
      };
    } catch (error) {
      logger.error('Naukri authentication failed', { error, userId });
      return {
        success: false,
        message: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    } finally {
      if (page) {
        await this.browserManager.close();
      }
    }
  }

  /**
   * Wait for successful login detection
   * Monitors URL changes and page content
   */
  private async waitForLoginSuccess(page: Page | null): Promise<boolean> {
    if (!page) return false;
    try {
      logger.info('Waiting for user to complete login...');

      // Wait for redirect after successful login
      // Naukri redirects to home or profile page after login
      await page.waitForURL(
        (url) => {
          const currentUrl = url.toString();
          // Check if redirected away from login page
          return !currentUrl.includes('/nlogin/login');
        },
        { timeout: 120000 } // 2 minute timeout
      );

      logger.info('Login successful, detected redirect');
      return true;
    } catch (error) {
      logger.error('Login timeout or cancelled', { error });
      return false;
    }
  }

  /**
   * Check if user has valid storage state
   */
  async hasValidAuth(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.naukriStorageState) {
        return false;
      }

      // Decrypt and validate structure
      const storageState = this.storageStateManager.decryptFromDB(
        user.naukriStorageState
      );

      // Check if cookies exist and are not empty
      return storageState.cookies && storageState.cookies.length > 0;
    } catch (error) {
      logger.error('Failed to validate auth', { error, userId });
      return false;
    }
  }

  /**
   * Clear stored authentication
   */
  async clearAuth(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $unset: { naukriStorageState: 1 },
    });
    logger.info('Cleared Naukri auth', { userId });
  }
}
