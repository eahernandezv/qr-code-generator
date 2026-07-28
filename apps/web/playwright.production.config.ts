import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'commerce-production.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['line'], ['html', { outputFolder: '../../.work-loop/evidence/stage2-remediation-cycle1/playwright-production-report', open: 'never' }]],
  outputDir: '../../.work-loop/evidence/stage2-remediation-cycle1/playwright-production-results',
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium-production-commerce', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'COMMERCE_PORT=4174 COMMERCE_ALLOW_TEST_CONTROLS=true COMMERCE_STATE_PATH=../../.work-loop/evidence/stage2-remediation-cycle1/http-commerce-state.json node ../../services/commerce/dist/httpServerCli.js',
      url: 'http://127.0.0.1:4174/api/commerce/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'VITE_COMMERCE_TEST_MODE=false VITE_COMMERCE_API_URL=http://127.0.0.1:4174/api/commerce VITE_ARTISTIC_CHECKOUT_ENABLED=true VITE_ARTISTIC_GENERATIVE_ENABLED=true VITE_ARTISTIC_REFINEMENT_ENABLED=true pnpm dev --host 127.0.0.1 --port 4175',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
