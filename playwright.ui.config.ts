import { defineConfig } from '@playwright/test';

// UI-only browser coverage: preview and isolated component callbacks; no live rooms.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'deciding-ui.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'Mobile 360', use: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 } },
    { name: 'Mobile 390', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
    { name: 'Mobile 430', use: { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 } },
    { name: 'Short screen', use: { viewport: { width: 390, height: 480 } } },
    { name: 'Desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'npm.cmd run dev',
    url: 'http://localhost:3000/preview',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
