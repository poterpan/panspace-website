import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? 'pnpm preview:cf' : 'pnpm build && pnpm preview:cf',
    url: `http://127.0.0.1:${PORT}/zh`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
