/**
 * Dedicated Playwright config for real Supabase E2E certification
 * This config connects to the ephemeral local Supabase stack
 * It expects VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be set
 */
const releaseValidationSpecs = /release-validation\.(demo|normal|normal-supabase)\.spec\.js/

export default {
  timeout: 120000, // Increased for email polling
  workers: 1, // Serial for stateful auth lifecycle
  testIgnore: releaseValidationSpecs,
  testDir: './tests/playwright/supabase-e2e',
  fullyParallel: false,
  webServer: {
    // Use port 5173 to match supabase/config.toml site_url
    // Pass Supabase credentials to Vite server via environment variables
    command: `VITE_SUPABASE_URL="${process.env.VITE_SUPABASE_URL}" VITE_SUPABASE_ANON_KEY="${process.env.VITE_SUPABASE_ANON_KEY}" npm run dev -- --host 127.0.0.1 --strictPort --port 5173`,
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI, // CI should start fresh
    timeout: 60000
  },
  use: {
    headless: true,
    trace: process.env.CI === 'true' ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI === 'true' ? 'only-on-failure' : 'off',
    video: process.env.CI === 'true' ? 'retain-on-failure' : 'off',
    baseURL: 'http://127.0.0.1:5173'
  },
  projects: [
    // Desktop for full auth lifecycle
    {
      name: 'desktop',
      testMatch: /auth-lifecycle\.spec\.js|data-isolation\.spec\.js/,
      use: { viewport: { width: 1440, height: 1000 } }
    },
    // Mobile for viewport-specific tests (390×844 = iPhone 12/13 Pro)
    {
      name: 'mobile',
      testMatch: /mobile-smoke\.spec\.js/,
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    }
  ]
}
