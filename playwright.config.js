/** Basic Playwright config; tests are optional and will only run if playwright is installed */
/** To run: npx playwright test tests/playwright */
const releaseValidationSpecs = /release-validation\.(demo|normal|normal-supabase)\.spec\.js/

export default {
  timeout: 60000,
  workers: process.env.CI ? 4 : 2,
  testIgnore: releaseValidationSpecs,
  webServer: {
    command: "VITE_SUPABASE_URL='' VITE_SUPABASE_ANON_KEY='' npm run dev -- --host 127.0.0.1 --strictPort --port 5180",
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: true,
    timeout: 60000
  },
  use: {
    headless: true,
    trace: process.env.CI === 'true' ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI === 'true' ? 'only-on-failure' : 'off',
    video: process.env.CI === 'true' ? 'retain-on-failure' : 'off'
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    {
      name: 'desktop',
      testIgnore: [
        /ui-v2\.spec\.js/,
        releaseValidationSpecs
      ],
      use: { viewport: { width: 1440, height: 1000 } }
    }
  ]
}
