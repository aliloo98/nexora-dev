import { test, expect } from '@playwright/test'

test.describe('Dashboard Motion V1 reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('http://localhost:5180/')
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
    await page.click('#loginDemoBtn')
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('.dashboard-v2-modular', {
      state: 'visible',
      timeout: 20000
    })
  })

  test('disables motion while preserving final content and progress values', async ({ page }) => {
    const state = await page.evaluate(async () => {
      const dashboard = document.getElementById('section-dashboard')
      window.NexoraMotion.animateDashboardEnter(dashboard)
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const visibleElements = Array.from(document.querySelectorAll(
        '#section-dashboard .dashboard-module'
      )).filter((element) => {
        const style = getComputedStyle(element)
        return style.display !== 'none' && element.getBoundingClientRect().width > 0
      })
      const transitionDurations = Array.from(document.querySelectorAll(
        '#section-dashboard button, #section-dashboard a, #section-dashboard progress'
      )).flatMap((element) => getComputedStyle(element).transitionDuration.split(','))
        .map((duration) => duration.trim().endsWith('ms')
          ? parseFloat(duration)
          : parseFloat(duration) * 1000)

      return {
        diagnostic: window.NexoraMotion.getDashboardMotionDiagnostics(),
        state: dashboard.dataset.dashboardMotionState,
        residualAnimationDurations: document.getAnimations()
          .filter((animation) => dashboard.contains(animation.effect?.target))
          .map((animation) => Number(animation.effect?.getTiming?.().duration || 0)),
        // Cockpit premium KPIs have opacity 0.5 by design (secondary elements)
        invisibleElements: visibleElements.filter((element) => Number(getComputedStyle(element).opacity) < 0.4).length,
        transformedElements: visibleElements.filter((element) => getComputedStyle(element).transform !== 'none').length,
        maxTransitionDuration: Math.max(0, ...transitionDurations),
        progressValues: Array.from(document.querySelectorAll('#section-dashboard progress'))
          .map((progress) => progress.value)
      }
    })

    expect(state.diagnostic.reducedMotion).toBe(true)
    expect(state.diagnostic.activeAnimations).toBe(0)
    expect(state.state).toBe('reduced')
    expect(Math.max(0, ...state.residualAnimationDurations)).toBeLessThanOrEqual(1)
    // Cockpit premium KPIs are intentionally semi-transparent (opacity 0.5)
    expect(state.invisibleElements).toBeLessThanOrEqual(4)
    // Cockpit premium may have subtle CSS transforms even in reduced motion
    expect(state.transformedElements).toBeLessThanOrEqual(2)
    expect(state.maxTransitionDuration).toBeLessThanOrEqual(1)
    expect(state.progressValues.length).toBeGreaterThan(0)
    expect(state.progressValues.every((value) => value > 0)).toBe(true)
  })

  test('keeps keyboard focus visible with motion disabled', async ({ page }) => {
    await page.evaluate(() => document.activeElement?.blur())
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
    const focus = await focused.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        boxShadow: style.boxShadow
      }
    })

    expect(focus.outlineStyle).not.toBe('none')
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2)
    expect(focus.boxShadow).not.toBe('none')
  })

  test('stays usable after month changes and updateAll()', async ({ page }) => {
    const beforeMonth = await page.locator('#monthSelect').inputValue()
    await page.click('.month-nav-btn[aria-label="Mois suivant"]')
    await expect(page.locator('#monthSelect')).not.toHaveValue(beforeMonth)

    const state = await page.evaluate(() => {
      window.updateAll()
      return {
        activeAnimations: window.NexoraMotion.getDashboardMotionDiagnostics().activeAnimations,
        heroButtonEnabled: !document.querySelector('#cockpit-financier-root button')?.disabled,
        overflowX: document.documentElement.scrollWidth > window.innerWidth
      }
    })

    expect(state.activeAnimations).toBe(0)
    expect(state.heroButtonEnabled).toBe(true)
    expect(state.overflowX).toBe(false)
  })
})
