import { BrowserManager } from '../services/playwright/BrowserManager.js';
import { StorageStateManager } from '../services/playwright/StorageStateManager.js';
import { NaukriAuthService } from '../services/playwright/naukri/NaukriAuthService.js';
import { NaukriScraperService } from '../services/playwright/naukri/NaukriScraperService.js';
import { NaukriApplierService } from '../services/playwright/naukri/NaukriApplierService.js';
import logger from '../utility/logger.js';

/**
 * CLI script to authenticate with Naukri
 * Run: npm run automation:auth <userId>
 */
async function main() {
  try {
    const userId = process.argv[2];
    if (!userId) {
      console.error('Usage: npm run automation:auth <userId>');
      process.exit(1);
    }

    logger.info('Starting Naukri authentication CLI', { userId });

    const authService = new NaukriAuthService();
    const result = await authService.authenticate(userId);

    if (result.success) {
      console.log('✓ Authentication successful!');
      console.log('✓ Storage state saved to database');
      process.exit(0);
    } else {
      console.error('✗ Authentication failed:', result.message);
      process.exit(1);
    }
  } catch (error) {
    logger.error('CLI error', { error });
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
