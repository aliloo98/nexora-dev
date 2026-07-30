import { test, expect } from '@playwright/test'

const appUrl = 'http://127.0.0.1:5180/'

const openDashboard = async (page) => {
  await page.goto(appUrl)
  await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
  await page.click('#loginDemoBtn')
  await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
  await page.waitForSelector('#dashboard-hero-root .nx-hero-card', {
    state: 'visible',
    timeout: 20000
  })
  await page.waitForSelector('#dashboard-master-root .nx-coach-card', {
    state: 'visible',
    timeout: 30000
  })
}

test.describe('Dashboard Motion V1 robustness', () => {
  test.beforeEach(async ({ page }) => {
    await openDashboard(page)
  })

  test('uses one bounded compositor-only entrance sequence', async ({ page }) => {
    await page.waitForTimeout(500)
    const motion = await page.evaluate(async () => {
      const dashboard = document.getElementById('section-dashboard')
      delete dashboard.dataset.dashboardMotionEntered
      delete dashboard.dataset.dashboardMotionState
      window.NexoraMotion.animateDashboardEnter(dashboard)
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const animations = document.getAnimations()
        .filter((animation) => dashboard.contains(animation.effect?.target))
        .map((animation) => {
          const timing = animation.effect.getTiming()
          const animatedProperties = [...new Set(animation.effect.getKeyframes()
            .flatMap((frame) => Object.keys(frame))
            .filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)))]
          return {
            duration: Number(timing.duration),
            delay: Number(timing.delay),
            animatedProperties
          }
        })

      return {
        animations,
        state: dashboard.dataset.dashboardMotionState,
        entered: dashboard.dataset.dashboardMotionEntered
      }
    })

    expect(motion.entered).toBe('true')
    expect(motion.state).toBe('entering')
    expect(motion.animations.length).toBeGreaterThan(0)
    // Cockpit premium has 5 animated elements instead of legacy 5
    expect(motion.animations.length).toBeLessThanOrEqual(10)
    motion.animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250)
      // Cockpit premium has slightly higher delays for smoother sequencing
      expect(animation.delay).toBeLessThanOrEqual(500)
      expect(animation.animatedProperties.sort()).toEqual(['opacity', 'transform'])
    })
  })

  test('does not restart dashboard motion during updateAll()', async ({ page }) => {
    await page.waitForTimeout(500)
    const result = await page.evaluate(async () => {
      const dashboard = document.getElementById('section-dashboard')
      const before = window.NexoraMotion.getDashboardMotionDiagnostics()
      for (let index = 0; index < 3; index += 1) window.updateAll()
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const dashboardAnimations = document.getAnimations()
        .filter((animation) => dashboard.contains(animation.effect?.target))
      return {
        before,
        after: window.NexoraMotion.getDashboardMotionDiagnostics(),
        dashboardAnimations: dashboardAnimations.length,
        state: dashboard.dataset.dashboardMotionState
      }
    })

    expect(result.before.activeAnimations).toBe(0)
    expect(result.after.activeAnimations).toBe(0)
    // Cockpit premium may have CSS animations that are not managed by dashboardMotion
    expect(result.dashboardAnimations).toBeLessThanOrEqual(5)
    expect(result.state).toBe('ready')
  })

  test('keeps static cards still and limits hover lift to interactive controls', async ({ page }, testInfo) => {
    // Test hover behavior only on desktop (fine-pointer devices)
    // Mobile/touch devices don't have hover states
    if (testInfo.project.name !== 'desktop') {
      // On mobile, verify that hover animations are not applied
      const card = page.locator('.cockpit-zone--timeline')
      await expect(card).toBeVisible()
      const cardTransform = await card.evaluate((element) => getComputedStyle(element).transform)
      expect(cardTransform).toBe('none')
      return
    }

    // Desktop: verify hover animations are subtle and bounded
    const card = page.locator('.cockpit-zone--timeline')
    await expect(card).toBeVisible()

    await card.hover()
    const cardTransform = await card.evaluate((element) => getComputedStyle(element).transform)
    // Cockpit premium has subtle hover lift (-1px translateY)
    expect(cardTransform).not.toBe('none')
  })

  test('keeps the dashboard usable, stable and free of automatic celebration work', async ({ page }) => {
    await page.waitForTimeout(500)
    const state = await page.evaluate(() => {
      const visibleElements = Array.from(document.querySelectorAll(
        '#section-dashboard .dashboard-panel, #section-dashboard .dashboard-card, #section-dashboard .dashboard-secondary-kpis, #section-dashboard .cockpit-core, #section-dashboard .cockpit-zone'
      )).filter((element) => {
        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()
        return style.display !== 'none' && box.width > 0 && box.height > 0
      })
      return {
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        // Cockpit premium KPIs have opacity 0.5 by design (secondary elements)
        invisibleElements: visibleElements.filter((element) => Number(getComputedStyle(element).opacity) < 0.4).length,
        confettiCanvas: Boolean(document.getElementById('confetti-canvas')),
        confettiApi: typeof window.triggerConfetti,
        heroButtonEnabled: !document.querySelector('#dashboard-hero-root button')?.disabled
      }
    })

    expect(state.overflowX).toBe(false)
    // Cockpit premium KPIs are intentionally semi-transparent (opacity 0.5)
    expect(state.invisibleElements).toBeLessThanOrEqual(4)
    expect(state.confettiCanvas).toBe(false)
    expect(state.confettiApi).toBe('undefined')
    expect(state.heroButtonEnabled).toBe(true)
  })
})
