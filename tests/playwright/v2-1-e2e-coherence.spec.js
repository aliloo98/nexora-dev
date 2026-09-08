import { test, expect } from '@playwright/test'

test.describe('V2.1 E2E Coherence - Dashboard Integration', () => {
  test('Dashboard renders without errors after adapter integration', async ({ page }) => {
    await page.goto('/')

    // Check for console errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Unlock auth for testing
    await page.evaluate(() => {
      document.body.classList.remove('auth-locked')
      const authContainer = document.getElementById('auth-container')
      const main = document.querySelector('main')
      const sidebar = document.querySelector('.sidebar')
      if (authContainer) authContainer.style.display = 'none'
      if (main) main.style.display = 'block'
      if (sidebar) sidebar.style.display = 'flex'
    })

    // Navigate to dashboard
    await page.goto('/#section-dashboard')
    await page.waitForTimeout(1000)

    // Verify no console errors related to the adapter
    const adapterErrors = errors.filter(e => e.includes('dashboardMetricsAdapter') || e.includes('publishJarvisDecisionContext'))
    expect(adapterErrors.length).toBe(0)

    console.log('✅ Dashboard renders without adapter-related errors')
  })

  test('Jarvis Decision Context module loads correctly', async ({ page }) => {
    await page.goto('/')

    const moduleLoaded = await page.evaluate(async () => {
      try {
        // Try to dynamically import the module
        const module = await import('/src/jarvis/dashboardMetricsAdapter.js')
        return typeof module.buildSnapshotFromDashboardMetrics === 'function'
      } catch (e) {
        console.error('Module load error:', e)
        return false
      }
    })

    expect(moduleLoaded).toBe(true)
    console.log('✅ dashboardMetricsAdapter module loads correctly')
  })
})
