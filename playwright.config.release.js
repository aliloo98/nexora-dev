/** Playwright config for release validation tests using production-like build */
/** Tests run against the dist folder served by preview server */
export default {
  timeout: 60000,
  workers: process.env.CI ? 4 : 2,
  webServer: {
    command: "npx vite preview --host --port 4173",
    url: 'http://localhost:4173',
    reuseExistingServer: false,
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
      use: { viewport: { width: 1440, height: 1000 } }
    }
  ]
}