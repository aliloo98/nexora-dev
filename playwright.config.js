/** Basic Playwright config; tests are optional and will only run if playwright is installed */
/** To run: npx playwright test tests/playwright */
module.exports = {
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 }
  }
}
