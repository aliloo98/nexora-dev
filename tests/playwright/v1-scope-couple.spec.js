/**
 * LOT J3 — V1 SCOPE CLEANUP — COUPLE EXCLUSION TEST
 *
 * Verifies that Couple mode is completely absent from V1 product experience
 * while preserving implementation for future restoration.
 */

import { test, expect } from '@playwright/test'

test.describe('V1 Scope - Couple Exclusion', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application using the dev server URL
    await page.goto('http://127.0.0.1:5180/')
    await page.waitForLoadState('networkidle')

    // Login with demo to access authenticated state
    const loginDemoBtn = page.locator('#loginDemoBtn')
    if (await loginDemoBtn.isVisible()) {
      await loginDemoBtn.click()
      await page.waitForURL('**/#section-dashboard', { timeout: 30000 })
      await page.waitForLoadState('networkidle')
    }
  })

  test('Desktop: Couple navigation is absent from active V1 UI', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Verify Couple navigation button exists but is hidden
    const coupleNavBtn = page.locator('.nav-btn[data-section="couple"]')
    await expect(coupleNavBtn).toHaveCount(1)
    await expect(coupleNavBtn).toBeHidden()

    // Verify navigation still has expected items (may be hidden on landing page)
    const expectedNavItems = ['dashboard', 'saisie', 'plan', 'nexora', 'parametres']
    for (const section of expectedNavItems) {
      const navBtn = page.locator(`.nav-btn[data-section="${section}"]`)
      await expect(navBtn).toHaveCount(1)
      // Don't check visibility on landing page - sidebar may be hidden
    }
  })

  test('Desktop: Couple section is not visible', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Verify Couple section exists but is hidden
    const coupleSection = page.locator('#section-couple')
    await expect(coupleSection).toHaveCount(1)
    await expect(coupleSection).toBeHidden()
  })

  test('Desktop: Legacy Couple deep-link safely falls back to Dashboard', async ({ page }) => {
    // Navigate to legacy Couple deep-link
    await page.goto('http://127.0.0.1:5180/#section-couple')

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')

    // Wait for route guard to process
    await page.waitForTimeout(2000)

    // Verify Couple section is hidden
    const coupleSection = page.locator('#section-couple')
    await expect(coupleSection).toHaveCount(1)
    await expect(coupleSection).toBeHidden()

    // Verify dashboard section is active (fallback behavior)
    const dashboardSection = page.locator('#section-dashboard.active')
    await expect(dashboardSection).toHaveCount(1)
  })

  test('Desktop: No console errors during Couple deep-link fallback', async ({ page }) => {
    // Collect console errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to legacy Couple deep-link
    await page.goto('http://127.0.0.1:5180/#section-couple')
    await page.waitForLoadState('networkidle')

    // Wait for route guard to process
    await page.waitForTimeout(2000)

    // Verify no Couple-related console errors
    const coupleErrors = errors.filter(err =>
      err.toLowerCase().includes('couple') ||
      err.toLowerCase().includes('section-couple')
    )
    expect(coupleErrors).toHaveLength(0)
  })

  test('Mobile (390x844): Couple navigation is absent', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })

    // Verify Couple navigation button exists but is hidden
    const coupleNavBtn = page.locator('.nav-btn[data-section="couple"]')
    await expect(coupleNavBtn).toHaveCount(1)
    await expect(coupleNavBtn).toBeHidden()

    // Verify navigation still has expected items
    const expectedNavItems = ['dashboard', 'saisie', 'plan', 'nexora', 'parametres']
    for (const section of expectedNavItems) {
      const navBtn = page.locator(`.nav-btn[data-section="${section}"]`)
      await expect(navBtn).toHaveCount(1)
    }
  })

  test('Mobile (390x844): Legacy Couple deep-link fallback works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })

    // Navigate to legacy Couple deep-link
    await page.goto('http://127.0.0.1:5180/#section-couple')
    await page.waitForLoadState('networkidle')

    // Wait for route guard to redirect
    await page.waitForTimeout(2000)

    // Verify Couple section is hidden
    const coupleSection = page.locator('#section-couple')
    await expect(coupleSection).toHaveCount(1)
    await expect(coupleSection).toBeHidden()

    // Verify URL was redirected to dashboard (fallback behavior)
    expect(page.url()).toContain('#section-dashboard')
  })

  test('Desktop: Couple controls remain hidden and unavailable in V1', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/')
    await page.waitForLoadState('networkidle')

    // Verify Couple nav button is hidden and not in viewport
    const coupleNavBtn = page.locator('.nav-btn[data-section="couple"]')
    await expect(coupleNavBtn).toHaveCount(1)
    await expect(coupleNavBtn).toBeHidden()
    await expect(coupleNavBtn).not.toBeInViewport()

    // Verify Couple section is hidden
    const coupleSection = page.locator('#section-couple')
    await expect(coupleSection).toHaveCount(1)
    await expect(coupleSection).toBeHidden()

    // Verify Couple nav button cannot receive keyboard focus
    await coupleNavBtn.focus()
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-section'))
    expect(focusedElement).not.toBe('couple')
  })

  test('Desktop: Couple settings panel is empty/hidden', async ({ page }) => {
    // Navigate to settings (assuming user can access settings)
    await page.goto('http://127.0.0.1:5180/#section-parametres')
    await page.waitForLoadState('networkidle')

    // Check for Couple settings root
    const coupleSettingsRoot = page.locator('#couple-mode-settings-root')

    // If element exists, it should be empty
    if (await coupleSettingsRoot.count() > 0) {
      const content = await coupleSettingsRoot.innerHTML()
      expect(content.trim()).toBe('')
    }
  })
})

test.describe('V1 Scope - Couple Runtime Bootstrap', () => {
  test('Normal startup does not initialize Couple-specific work', async ({ page }) => {
    // Track network requests
    const coupleRequests = []
    page.on('request', request => {
      const url = request.url().toLowerCase()
      if (url.includes('couple')) {
        coupleRequests.push(url)
      }
    })

    // Normal app startup
    await page.goto('http://127.0.0.1:5180/')
    await page.waitForLoadState('networkidle')

    // Verify no Couple-specific network requests during normal startup
    // (Generic Supabase/auth traffic is allowed)
    const supabaseCoupleRequests = coupleRequests.filter(url =>
      url.includes('supabase') && url.includes('couple')
    )
    expect(supabaseCoupleRequests).toHaveLength(0)
  })
})

test.describe('V1 Scope - Restoration Contract', () => {
  test('Couple DOM shell exists for future restoration', async ({ page }) => {
    // Wait for page to load
    await page.goto('http://127.0.0.1:5180/')
    await page.waitForLoadState('networkidle')

    // Verify Couple navigation button exists in DOM (required for restoration)
    const coupleNavBtn = page.locator('.nav-btn[data-section="couple"]')
    await expect(coupleNavBtn).toHaveCount(1)

    // Verify Couple section exists in DOM (required for restoration)
    const coupleSection = page.locator('#section-couple')
    await expect(coupleSection).toHaveCount(1)

    // Verify both are hidden in V1 state
    await expect(coupleNavBtn).toBeHidden()
    await expect(coupleSection).toBeHidden()
  })

  test('V1 disabled state: Couple controls are hidden by flag', async ({ page }) => {
    // Wait for page to load
    await page.goto('http://127.0.0.1:5180/')
    await page.waitForLoadState('networkidle')

    // Verify Couple controls are hidden (indicates V1_SCOPE.COUPLE_MODE_ENABLED = false)
    const flagState = await page.evaluate(() => {
      const coupleNav = document.querySelector('.nav-btn[data-section="couple"]')
      const coupleSection = document.getElementById('section-couple')
      const navHidden = coupleNav && coupleNav.style.display === 'none'
      const sectionHidden = coupleSection && coupleSection.style.display === 'none'
      return { navHidden, sectionHidden }
    })

    expect(flagState.navHidden).toBe(true)
    expect(flagState.sectionHidden).toBe(true)
  })
})
