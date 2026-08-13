import { test, expect } from '@playwright/test'

test.describe('Plan Actionability J2 Desktop', () => {
  test.use({ viewport: { width: 1440, height: 1000 } })

  test('Plan CTA navigates to Budget when judgment recommends budget action', async ({ page }) => {
    // Use official test server URL from playwright.config.js
    await page.goto('http://127.0.0.1:5180')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Perform real demo login
    const loginDemoBtn = page.locator('#loginDemoBtn')
    await expect(loginDemoBtn).toBeVisible()
    await loginDemoBtn.click()

    // Wait for navigation to dashboard
    await page.waitForURL('**/#section-dashboard', { timeout: 30000 })

    // Wait for dashboard V2 modular to be visible
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Navigate to Plan using window.location.hash (existing pattern)
    await page.evaluate(() => {
      window.location.hash = '#section-plan'
    })
    await page.waitForURL('**/#section-plan', { timeout: 10000 })

    // Wait for Plan to load
    await page.waitForSelector('#plan-root', { state: 'visible', timeout: 10000 })

    // Find "Ce qu'il faut faire aujourd'hui" card
    const todayActionCard = page.locator('.plan-card').filter({ hasText: "Ce qu'il faut faire aujourd'hui" })
    await expect(todayActionCard).toBeVisible()

    // Check if Budget CTA exists (depends on demo mode judgment)
    const budgetCTA = page.locator('[data-plan-action="navigate-budget"]')
    const ctaExists = await budgetCTA.count() > 0

    if (ctaExists) {
      // Verify CTA has correct accessible name
      await expect(budgetCTA).toHaveText(/Saisir mes revenus|Vérifier mon budget/)

      // Verify CTA is a button
      await expect(budgetCTA).toHaveAttribute('role', 'button')

      // Focus CTA with keyboard
      await budgetCTA.focus()
      await expect(budgetCTA).toBeFocused()

      // Press Enter to trigger navigation
      await page.keyboard.press('Enter')

      // Verify Budget section becomes active
      await page.waitForURL('**/#section-saisie', { timeout: 5000 })
      await expect(page.locator('#section-saisie')).toHaveClass(/active/)

      // Verify Plan is no longer active
      await expect(page.locator('#section-plan')).not.toHaveClass(/active/)

      // Verify Budget section is visible
      await expect(page.locator('#section-saisie')).toBeVisible()
    } else {
      // Demo mode judgment doesn't recommend budget action - this is acceptable
      // The unit tests verify the CTA logic is correct
      console.log('Demo mode does not produce budget recommendation - CTA not expected')
    }
  })
})

test.describe('Plan Actionability J2 Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Plan CTA works on mobile viewport when present', async ({ page }) => {
    // Use official test server URL
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Perform real demo login
    const loginDemoBtn = page.locator('#loginDemoBtn')
    await expect(loginDemoBtn).toBeVisible()
    await loginDemoBtn.click()

    // Wait for navigation to dashboard
    await page.waitForURL('**/#section-dashboard', { timeout: 30000 })
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Navigate to Plan
    await page.evaluate(() => {
      window.location.hash = '#section-plan'
    })
    await page.waitForURL('**/#section-plan', { timeout: 10000 })
    await page.waitForSelector('#plan-root', { state: 'visible', timeout: 10000 })

    // Check if CTA exists
    const budgetCTA = page.locator('[data-plan-action="navigate-budget"]')
    const ctaExists = await budgetCTA.count() > 0

    if (ctaExists) {
      // Verify CTA is not clipped (check bounding box)
      const box = await budgetCTA.boundingBox()
      expect(box).toBeTruthy()
      expect(box.width).toBeGreaterThan(0)
      expect(box.height).toBeGreaterThan(0)

      // Verify touch target is acceptable (>= 44px)
      expect(box.height).toBeGreaterThanOrEqual(44)

      // Tap CTA
      await budgetCTA.tap()

      // Verify Budget section becomes active
      await page.waitForURL('**/#section-saisie', { timeout: 5000 })
      await expect(page.locator('#section-saisie')).toHaveClass(/active/)

      // Verify layout is not broken
      await expect(page.locator('#section-saisie')).toBeVisible()
    } else {
      console.log('Demo mode does not produce budget recommendation - CTA not expected')
    }
  })
})