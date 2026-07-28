import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'commerce-production.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['line'], ['html', { outputFolder: '../../.work-loop/evidence/stage2-commerce/playwright-report', open: 'never' }]],
  outputDir: '../../.work-loop/evidence/stage2-commerce/playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'VITE_COMMERCE_TEST_MODE=true VITE_ARTISTIC_CHECKOUT_ENABLED=true VITE_ARTISTIC_GENERATIVE_ENABLED=true VITE_ARTISTIC_REFINEMENT_ENABLED=true pnpm dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
