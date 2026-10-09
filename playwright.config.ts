import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Who Are You Really?
 * Tests 2-player isolated browser sessions with real WebSockets/RTDB polling.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 60 * 1000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Mobile Pixel 7 (393px)',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'Desktop Chrome (1280px)',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
