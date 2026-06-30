import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Trendy e-commerce E2E tests.
 *
 * Assumes both servers are already running:
 *   - Frontend:  npm run dev  (port 5173)
 *   - Backend:   node server.js  (port 5000)
 *
 * Alternatively, set CI=true and the webServer block will start them.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,          // run sequentially to avoid port clashes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                    // one worker keeps tests isolated on the same DB
  reporter: [['html', { open: 'never' }], ['list']],

  timeout: 120_000,              // generous timeout for full user flows
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the dev server automatically when CI=true */
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
