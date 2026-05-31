/** Basic Playwright config; tests are optional and will only run if playwright is installed */
/** To run: npx playwright test tests/playwright */
export default {
  timeout: 30000,
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30000
  },
  use: {
    headless: true,
    viewport: { width: 390, height: 844 }
  }
}
