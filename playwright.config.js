/** Basic Playwright config; tests are optional and will only run if playwright is installed */
/** To run: npx playwright test tests/playwright */
export default {
  timeout: 60000,
  webServer: {
    command: "VITE_SUPABASE_URL='' VITE_SUPABASE_ANON_KEY='' npm run dev -- --host 127.0.0.1 --strictPort --port 5180",
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: false,
    timeout: 60000
  },
  use: {
    headless: true
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } }
  ]
}
