import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserConfig } from '../../types/automation.types.js';
import logger from '../../utility/logger.js';

/**
 * Manages Playwright browser lifecycle and context creation
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  /**
   * Launch browser with specified configuration
   */
  async launch(config?: Partial<BrowserConfig>): Promise<Browser> {
    const headless = config?.headless ?? process.env.PLAYWRIGHT_HEADLESS === 'true';

    logger.info('Launching browser', { headless });

    this.browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    logger.info('Browser launched successfully');
    return this.browser;
  }

  /**
   * Create a new browser context
   * Can optionally load storageState for authenticated sessions
   */
  async createContext(config?: Partial<BrowserConfig>): Promise<BrowserContext> {
    if (!this.browser) {
      await this.launch(config);
    }

    logger.info('Creating browser context', {
      hasStorageState: !!config?.storageStatePath,
    });

    const contextOptions: any = {
      userAgent: config?.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: config?.viewport || { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    };

    if (config?.storageStatePath) {
      contextOptions.storageState = config.storageStatePath;
    }

    this.context = await this.browser!.newContext(contextOptions);

    // Setup default timeouts
    this.context.setDefaultTimeout(30000);
    this.context.setDefaultNavigationTimeout(60000);

    logger.info('Browser context created');
    return this.context;
  }

  /**
   * Create a new page in the current context
   */
  async newPage(): Promise<Page> {
    if (!this.context) {
      await this.createContext();
    }

    const page = await this.context!.newPage();
    logger.debug('New page created');
    return page;
  }

  /**
   * Get the current browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Get the current context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Save current storage state to file
   */
  async saveStorageState(path: string): Promise<void> {
    if (!this.context) {
      throw new Error('No active context to save storage state from');
    }

    await this.context.storageState({ path });
    logger.info('Storage state saved', { path });
  }

  /**
   * Get storage state as JSON object
   */
  async getStorageState(): Promise<any> {
    if (!this.context) {
      throw new Error('No active context to get storage state from');
    }

    const state = await this.context.storageState();
    logger.debug('Storage state retrieved');
    return state;
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      logger.info('Browser context closed');
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  /**
   * Check if browser is running
   */
  isConnected(): boolean {
    return this.browser?.isConnected() ?? false;
  }
}
