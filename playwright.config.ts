import { defineConfig, devices } from '@playwright/test';
import { acceptanceEnv } from './tests/helpers/acceptanceEnv';

const target = acceptanceEnv();

/**
 * Playwright E2E configuration for Who Are You Really?
 * Tests 2-player isolated browser sessions with real WebSockets/RTDB polling.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 240 * 1000,
  workers: 1,
  maxFailures: 1,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: target.baseURL.toString(),
    actionTimeout: 15_000,
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
    command: `npm run start -- --hostname ${target.baseURL.hostname} --port ${target.baseURL.port || '80'}`,
    url: target.baseURL.toString(),
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
