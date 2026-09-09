import { defineConfig } from '@playwright/test';

/**
 * Playwright config.
 *
 * This file previously contained a bare JSON object literal with no import and
 * no export, so `playwright test` could not load it at all.
 */
const PORT = Number(process.env.PORT) || 8000;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  workers: 1,

  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // slowMo belongs to launchOptions, not directly under `use`.
    launchOptions: {
      slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO) || 0,
    },
  },

  webServer: {
    command: 'npm run dev',
    port: PORT,
    timeout: 120_000,
    // Reuse a server the developer already has running locally, but always
    // start a clean one in CI.
    reuseExistingServer: !process.env.CI,
  },
});
