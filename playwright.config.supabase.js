/**
 * Dedicated Playwright config for real Supabase E2E certification
 * This config connects to the ephemeral local Supabase stack
 * It expects VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be set
 */
const releaseValidationSpecs = /release-validation\.(demo|normal|normal-supabase)\.spec\.js/

export default {
  timeout: 120000, // Increased for email polling
  workers: process.env.CI ? 2 : 1, // Conservative for auth sequencing
  testIgnore: releaseValidationSpecs,
  testMatch: /tests\/playwright\/supabase-e2e\/.*\.spec\.js$/, // Only run Supabase E2E tests
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
    // Mobile viewport for key smoke tests
    { 
      name: 'mobile-smoke', 
      use: { viewport: { width: 390, height: 844 } }
    },
    // Desktop for full auth lifecycle
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 1000 } }
    }
  ]
}
