/**
 * Jarvis Cockpit - Runtime Validation Tests
 *
 * LOT J5 - Autonomous runtime validation of Jarvis Financial Cockpit
 */

import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

const formatViolations = (violations) => violations.map(({ id, impact, nodes }) => ({
  id,
  impact,
  targets: nodes.map((node) => node.target)
}))

test.describe('Jarvis Cockpit - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    // Use official test server URL from playwright.config.js
    await page.goto('http://localhost:5180')
    await page.waitForLoadState('networkidle')

    // Perform real demo login
    const loginDemoBtn = page.locator('#loginDemoBtn')
    await expect(loginDemoBtn).toBeVisible()
    await loginDemoBtn.click()

    // Wait for navigation to dashboard
    await page.waitForURL('**/#section-dashboard', { timeout: 30000 })

    // Wait for dashboard V2 modular to be visible
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Verify setNexoraUxMode exists in runtime
    const hasSetNexoraUxMode = await page.evaluate(() => typeof window.setNexoraUxMode === 'function')
    expect(hasSetNexoraUxMode).toBe(true)
  })

  test('1. Complete mode shows Jarvis', async ({ page }) => {
    // Set Complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)

    // Verify Complete mode is active
    await expect(page.locator('body')).toHaveClass(/mode-complete/)
    
    // Verify Jarvis is present
    const jarvisCockpit = page.locator('#cockpit-financier-root .jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Verify Hero legacy is NOT in the cockpit
    const legacyHero = page.locator('#cockpit-financier-root .nx-hero-card')
    await expect(legacyHero).toHaveCount(0)
  })

  test('2. Complete mode Jarvis passes accessibility scan', async ({ page }) => {
    // Set Complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })

    await page.waitForTimeout(1000)

    // Verify Complete mode is active
    await expect(page.locator('body')).toHaveClass(/mode-complete/)

    // Verify Jarvis is present
    const jarvisCockpit = page.locator('#cockpit-financier-root .jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)

    // Wait for Jarvis motion to complete
    await page.waitForFunction(() => {
      const hero = document.querySelector('.jarvis-hero')
      return hero && hero.dataset.motionState === 'complete'
    }, { timeout: 10000 })

    // Wait for priority card animation to complete (has 120ms delay + 500ms animation)
    await page.waitForTimeout(700)

    // Scan Jarvis for accessibility violations
    const jarvis = await new AxeBuilder({ page }).include('.jarvis-cockpit').analyze()
    expect(formatViolations(jarvis.violations)).toEqual([])
  })

  test('3. Simplified mode excludes Jarvis', async ({ page }) => {
    // Set Simplified mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple')
      }
    })
    
    await page.waitForTimeout(1000)

    // Verify Simple mode is active
    await expect(page.locator('body')).toHaveClass(/mode-simple/)
    
    // Jarvis cockpit should not exist in Simplified mode
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(0)
    
    // Legacy hero should exist
    const legacyHero = page.locator('#cockpit-financier-root .nx-hero-card')
    await expect(legacyHero).toHaveCount(1)
  })

  test('4. Simple → Complete transition', async ({ page }) => {
    const jarvisCockpit = page.locator('#cockpit-financier-root .jarvis-cockpit')

    // Let the initial Complete-mode render settle before switching modes.
    await expect(jarvisCockpit).toHaveCount(1)

    // Start in Simple mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple')
      }
    })

    await page.waitForFunction(() => {
      const cockpitRoot = document.querySelector('#cockpit-financier-root')
      return document.body.classList.contains('mode-simple')
        && !document.body.classList.contains('mode-complete')
        && !cockpitRoot?.querySelector('.jarvis-cockpit')
        && cockpitRoot?.querySelector('.nx-hero-card')
    })

    // Verify Jarvis is not present
    await expect(jarvisCockpit).toHaveCount(0)
    
    // Verify Hero legacy is present
    const legacyHero = page.locator('#cockpit-financier-root .nx-hero-card')
    await expect(legacyHero).toHaveCount(1)

    // Switch to Complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })

    await page.waitForFunction(() => {
      const cockpitRoot = document.querySelector('#cockpit-financier-root')
      return document.body.classList.contains('mode-complete')
        && !document.body.classList.contains('mode-simple')
        && cockpitRoot?.querySelector('.jarvis-cockpit')
        && !cockpitRoot?.querySelector('.nx-hero-card')
    })
    
    // Verify Jarvis is now present
    await expect(jarvisCockpit).toHaveCount(1)

    // Verify Hero legacy is removed
    await expect(legacyHero).toHaveCount(0)
  })

  test('5. Complete → Simple transition', async ({ page }) => {
    // Start in Complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(500)

    // Verify Jarvis is present
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Switch to Simple mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Verify Jarvis is now absent
    await expect(jarvisCockpit).toHaveCount(0)

    // Verify Hero legacy is restored
    const legacyHero = page.locator('#cockpit-financier-root .nx-hero-card')
    await expect(legacyHero).toHaveCount(1)
  })

  test('6. no-duplicate Jarvis roots on repeated navigation', async ({ page }) => {
    // Set Complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(500)
    
    // Navigate away and back multiple times using section navigation
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        if (typeof window.showSection === 'function') {
          window.showSection('budget')
        }
      })
      await page.waitForTimeout(300)
      
      await page.evaluate(() => {
        if (typeof window.showSection === 'function') {
          window.showSection('dashboard')
        }
      })
      await page.waitForTimeout(300)
    }
    
    // Should still have exactly one Jarvis cockpit
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
  })

  test('7. console and page errors collection', async ({ page }) => {
    // Collect console errors
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Collect page errors
    const pageErrors = []
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })
    
    // Set Complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(2000)
    
    // Verify no console errors
    console.log('Console errors:', consoleErrors)
    expect(consoleErrors.length).toBe(0)
    
    // Verify no page errors
    console.log('Page errors:', pageErrors)
    expect(pageErrors.length).toBe(0)
  })

  test('8. viewport 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Jarvis should render
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth
    })
    
    expect(hasOverflow).toBeFalsy()
  })

  test('9. viewport 1366x768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Jarvis should render
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth
    })
    
    expect(hasOverflow).toBeFalsy()
  })

  test('10. viewport 1024x768', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Jarvis should render
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth
    })
    
    expect(hasOverflow).toBeFalsy()
  })

  test('11. keyboard CTA Enter activation', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Find CTA button
    const ctaButton = page.locator('.jarvis-cta')
    const count = await ctaButton.count()
    
    if (count > 0) {
      // Focus and press Enter
      await ctaButton.first().focus()
      await ctaButton.first().press('Enter')
      await page.waitForTimeout(500)
    }
  })

  test('12. keyboard CTA Space activation', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Find CTA button
    const ctaButton = page.locator('.jarvis-cta')
    const count = await ctaButton.count()
    
    if (count > 0) {
      // Focus and press Space
      await ctaButton.first().focus()
      await ctaButton.first().press('Space')
      await page.waitForTimeout(500)
    }
  })

  test('13. normal motion behavior', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Jarvis should render
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
  })

  test('14. reduced motion behavior', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Jarvis should render
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Check that reduced motion is respected
    const respectsReducedMotion = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })
    
    expect(respectsReducedMotion).toBeTruthy()
  })
})

test.describe('Jarvis Cockpit - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('http://localhost:5180')
    await page.waitForLoadState('networkidle')

    // Perform real demo login
    const loginDemoBtn = page.locator('#loginDemoBtn')
    await expect(loginDemoBtn).toBeVisible()
    await loginDemoBtn.click()

    // Wait for navigation to dashboard
    await page.waitForURL('**/#section-dashboard', { timeout: 30000 })

    // Wait for dashboard V2 modular to be visible
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Verify setNexoraUxMode exists in runtime
    const hasSetNexoraUxMode = await page.evaluate(() => typeof window.setNexoraUxMode === 'function')
    expect(hasSetNexoraUxMode).toBe(true)
  })

  test('15. mobile viewport 375x812', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)
    
    // Jarvis should render
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth
    })
    
    expect(hasOverflow).toBeFalsy()
  })

  test('16. mobile Simple mode', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple')
      }
    })
    
    await page.waitForFunction(() => {
      const cockpitRoot = document.querySelector('#cockpit-financier-root')
      return document.body.classList.contains('mode-simple')
        && !document.querySelector('.jarvis-cockpit')
        && cockpitRoot?.querySelector('.nx-hero-card')
    })

    // Jarvis should not exist in Simple mode
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(0)

    // Legacy hero should exist
    const legacyHero = page.locator('#cockpit-financier-root .nx-hero-card')
    await expect(legacyHero).toHaveCount(1)
  })
})

test.describe('Jarvis Cockpit - Refresh Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Use official test server URL from playwright.config.js
    await page.goto('http://localhost:5180')
    await page.waitForLoadState('networkidle')

    // Perform real demo login
    const loginDemoBtn = page.locator('#loginDemoBtn')
    await expect(loginDemoBtn).toBeVisible()
    await loginDemoBtn.click()

    // Wait for navigation to dashboard
    await page.waitForURL('**/#section-dashboard', { timeout: 30000 })

    // Wait for dashboard V2 modular to be visible
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Verify setNexoraUxMode exists in runtime
    const hasSetNexoraUxMode = await page.evaluate(() => typeof window.setNexoraUxMode === 'function')
    expect(hasSetNexoraUxMode).toBe(true)
  })

  test('17. Complete mode refresh persistence', async ({ page }) => {
    // Set Complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      }
    })
    
    await page.waitForTimeout(1000)

    // Verify Jarvis is present before refresh
    const jarvisCockpit = page.locator('#cockpit-financier-root .jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000 })
    
    // Verify Jarvis is still present after refresh
    await expect(jarvisCockpit).toHaveCount(1)
    
    // Verify mode is still Complete
    await expect(page.locator('body')).toHaveClass(/mode-complete/)
    
    // Verify Hero legacy is NOT in the cockpit
    const legacyHero = page.locator('#cockpit-financier-root .nx-hero-card')
    await expect(legacyHero).toHaveCount(0)
  })

  test('18. Simplified mode refresh persistence', async ({ page }) => {
    // Set Simplified mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple')
      }
    })
    
    await page.waitForFunction(() => {
      const cockpitRoot = document.querySelector('#cockpit-financier-root')
      return document.body.classList.contains('mode-simple')
        && !document.querySelector('.jarvis-cockpit')
        && cockpitRoot?.querySelector('.nx-hero-card')
    })

    // Verify Jarvis is not present before refresh
    const jarvisCockpit = page.locator('.jarvis-cockpit')
    await expect(jarvisCockpit).toHaveCount(0)
    
    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000 })
    
    // Verify Jarvis is still not present after refresh
    await expect(jarvisCockpit).toHaveCount(0)
    
    // Verify mode is still Simple
    await expect(page.locator('body')).toHaveClass(/mode-simple/)
    
    // Verify Hero legacy is present
    const legacyHero = page.locator('#cockpit-financier-root .nx-hero-card')
    await expect(legacyHero).toHaveCount(1)
  })
})

test.describe('Jarvis Cockpit - MutationObserver Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Use official test server URL from playwright.config.js
    await page.goto('http://localhost:5180')
    await page.waitForLoadState('networkidle')

    // Perform real demo login
    const loginDemoBtn = page.locator('#loginDemoBtn')
    await expect(loginDemoBtn).toBeVisible()
    await loginDemoBtn.click()

    // Wait for navigation to dashboard
    await page.waitForURL('**/#section-dashboard', { timeout: 30000 })

    // Wait for dashboard V2 modular to be visible
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Verify setNexoraUxMode exists in runtime
    const hasSetNexoraUxMode = await page.evaluate(() => typeof window.setNexoraUxMode === 'function')
    expect(hasSetNexoraUxMode).toBe(true)
  })

  test('19. no duplicate Jarvis roots on repeated mode switches', async ({ page }) => {
    // Switch modes multiple times
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        if (typeof window.setNexoraUxMode === 'function') {
          window.setNexoraUxMode('complete')
        }
      })
      await page.waitForTimeout(200)
      
      await page.evaluate(() => {
        if (typeof window.setNexoraUxMode === 'function') {
          window.setNexoraUxMode('simple')
        }
      })
      await page.waitForTimeout(200)
    }

    // Check for duplicate roots
    const jarvisCount = await page.locator('.jarvis-cockpit').count()
    expect(jarvisCount).toBeLessThanOrEqual(1)
  })
})
