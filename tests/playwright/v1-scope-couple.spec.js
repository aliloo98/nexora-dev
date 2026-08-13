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
  })

  test('Desktop: Couple navigation is absent from active V1 UI', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Verify no Couple navigation item exists
    const coupleNavBtn = page.locator('.nav-btn[data-section="couple"]')
    await expect(coupleNavBtn).toHaveCount(0)
    
    // Verify navigation still has expected items
    const expectedNavItems = ['dashboard', 'saisie', 'plan', 'nexora', 'parametres']
    for (const section of expectedNavItems) {
      const navBtn = page.locator(`.nav-btn[data-section="${section}"]`)
      await expect(navBtn).toHaveCount(1)
    }
  })

  test('Desktop: Couple section is not visible', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Verify Couple section does not exist in DOM
    const coupleSection = page.locator('#section-couple')
    await expect(coupleSection).toHaveCount(0)
  })

  test('Desktop: Legacy Couple deep-link safely falls back to Dashboard', async ({ page }) => {
    // Navigate to legacy Couple deep-link
    await page.goto('http://127.0.0.1:5180/#section-couple')
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')
    
    // Verify URL was redirected to dashboard
    expect(page.url()).toContain('#section-dashboard')
    
    // Verify dashboard section is active
    const dashboardSection = page.locator('#section-dashboard.active')
    await expect(dashboardSection).toHaveCount(1)
    
    // Verify Couple section is still not visible
    const coupleSection = page.locator('#section-couple')
    await expect(coupleSection).toHaveCount(0)
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
    await page.goto('http://127.0.0.1:5180/')
    await page.waitForLoadState('networkidle')
    
    // Verify no Couple navigation item exists
    const coupleNavBtn = page.locator('.nav-btn[data-section="couple"]')
    await expect(coupleNavBtn).toHaveCount(0)
    
    // Verify no layout gap or orphaned navigation elements
    const navButtons = page.locator('.nav-btn')
    const buttonCount = await navButtons.count()
    expect(buttonCount).toBeGreaterThan(0)
    
    // Verify navigation is visually intact
    const firstNavBtn = navButtons.first()
    await expect(firstNavBtn).toBeVisible()
  })

  test('Mobile (390x844): Legacy Couple deep-link fallback works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })
    
    // Navigate to legacy Couple deep-link
    await page.goto('http://127.0.0.1:5180/#section-couple')
    await page.waitForLoadState('networkidle')
    
    // Verify URL was redirected to dashboard
    expect(page.url()).toContain('#section-dashboard')
    
    // Verify dashboard section is active
    const dashboardSection = page.locator('#section-dashboard.active')
    await expect(dashboardSection).toHaveCount(1)
  })

  test('Desktop: No focusable Couple control in accessibility tree', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/')
    await page.waitForLoadState('networkidle')
    
    // Get all focusable elements
    const focusableElements = await page.locator('a, button, input, select, textarea, [tabindex]').all()
    
    // Check none have Couple-related attributes
    for (const element of focusableElements) {
      const dataSection = await element.getAttribute('data-section')
      const href = await element.getAttribute('href')
      const ariaLabel = await element.getAttribute('aria-label')
      
      expect(dataSection).not.toBe('couple')
      expect(href).not.toContain('section-couple')
      expect(ariaLabel).not.toMatch(/couple/i)
    }
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
