import { test, expect, Page } from '@playwright/test';
// NodeNext module resolution requires the .js extension on relative imports.
import { StorageStateManager } from '../src/services/playwright/StorageStateManager.js';

test.describe('Naukri Job Applier Flow', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test('should authenticate with Naukri', async () => {
    // This test demonstrates the auth flow
    // In real scenario, user would login manually in headed mode
    await page.goto('https://www.naukri.com/nlogin/login');

    // Verify login page loaded
    const loginButton = await page.$('[type="submit"]');
    expect(loginButton).toBeTruthy();
  });

  test('should scrape job listings', async () => {
    // Navigate to job search
    await page.goto(
      'https://www.naukri.com/jobs/Node.js-jobs-in-Remote?experience=1'
    );

    // Wait for job cards to load
    await page.waitForSelector('[data-job-id]', { timeout: 10000 });

    // Get job count
    const jobCards = await page.$$('[data-job-id]');
    expect(jobCards.length).toBeGreaterThan(0);
  });

  test('encryption and decryption works correctly', () => {
    const storageStateManager = new StorageStateManager();

    // Mock storage state
    const originalState = {
      cookies: [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: '.naukri.com',
          path: '/',
        },
      ],
      origins: [],
    };

    // Encrypt
    const encrypted = storageStateManager.encryptForDB(originalState);
    expect(encrypted).toBeTruthy();

    // Decrypt
    const decrypted = storageStateManager.decryptFromDB(encrypted);
    expect(decrypted.cookies[0].name).toBe('test_cookie');
    expect(decrypted.cookies[0].value).toBe('test_value');
  });

  test.afterAll(async () => {
    await page.close();
  });
});
