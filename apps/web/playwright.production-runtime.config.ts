import { defineConfig, devices } from '@playwright/test'

const evidenceRoot = '../../.work-loop/evidence/studio-a4-production-runtime'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-runtime.spec.ts',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['line'], ['html', { outputFolder: `${evidenceRoot}/playwright-report`, open: 'never' }]],
  outputDir: `${evidenceRoot}/playwright-results`,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium-production-runtime', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'ARTISTIC_QR_PORT=8787 ARTISTIC_QR_SUPERVISOR_CONTROL_PORT=8788 node scripts/artistic-core-supervisor.mjs',
      port: 8787,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `COMMERCE_PORT=4174 COMMERCE_ALLOW_TEST_CONTROLS=true COMMERCE_STATE_PATH=${evidenceRoot}/commerce-state.json node ../../services/commerce/dist/httpServerCli.js`,
      url: 'http://127.0.0.1:4174/api/commerce/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'VITE_COMMERCE_TEST_MODE=false VITE_ARTISTIC_CHECKOUT_ENABLED=true VITE_ARTISTIC_GENERATIVE_ENABLED=true VITE_ARTISTIC_REFINEMENT_ENABLED=true pnpm build && WEB_PORT=4175 ARTISTIC_QR_UPSTREAM=http://127.0.0.1:8787 COMMERCE_UPSTREAM=http://127.0.0.1:4174/api/commerce node scripts/production-server.mjs',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
