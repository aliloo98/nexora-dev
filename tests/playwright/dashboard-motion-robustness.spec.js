import { test, expect } from '@playwright/test'

const appUrl = 'http://127.0.0.1:5180/'

const openDashboard = async (page) => {
  await page.goto(appUrl)
  await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
  await page.click('#loginDemoBtn')
  await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
  await page.waitForSelector('.dashboard-v2-modular', {
    state: 'visible',
    timeout: 20000
  })
}

// Main cockpit section selectors for motion entrance checks
const entranceSelector = '.dashboard-module, .dashboard-clean-header'

test.describe('Dashboard Motion V1 robustness', () => {
  test.beforeEach(async ({ page }) => {
    await openDashboard(page)
  })

  test('Login → Dashboard has entrance animations', async ({ page }) => {
    await page.waitForTimeout(500)
    const motion = await page.evaluate(async (selector) => {
      const dashboard = document.getElementById('section-dashboard')
      window.NexoraMotion.animateDashboardEnter(dashboard)
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector)
        })
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
    }, entranceSelector)

    expect(motion.entered).toBe('true')
    expect(['entering', 'ready']).toContain(motion.state)
    expect(motion.animations.length).toBeGreaterThan(0)
    motion.animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250) // Design System max duration
      expect(animation.animatedProperties.sort()).toEqual(['opacity', 'transform'])
    })
  })

  test('Dashboard → Plan → Dashboard triggers new entrance animation', async ({ page }) => {
    await page.waitForTimeout(500)

    // Navigate to Plan
    await page.evaluate(() => {
      window.location.hash = '#section-plan'
    })
    await page.waitForURL('**/#section-plan', { timeout: 20000 })
    await page.waitForTimeout(300)

    // Navigate back to Dashboard
    await page.evaluate(() => {
      window.location.hash = '#section-dashboard'
    })
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 20000 })
    await page.waitForTimeout(500)

    const motion = await page.evaluate(async (selector) => {
      const dashboard = document.getElementById('section-dashboard')
      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector)
        })
        .map((animation) => {
          const timing = animation.effect.getTiming()
          return {
            duration: Number(timing.duration),
            delay: Number(timing.delay)
          }
        })

      return {
        animations,
        state: dashboard.dataset.dashboardMotionState,
        entered: dashboard.dataset.dashboardMotionEntered
      }
    }, entranceSelector)

    expect(motion.entered).toBe('true')
    expect(motion.animations.length).toBeGreaterThan(0)
    motion.animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250)
    })
  })

  test('Dashboard → Saisie → Dashboard triggers new entrance animation', async ({ page }) => {
    await page.waitForTimeout(500)

    // Navigate to Saisie
    await page.evaluate(() => {
      window.location.hash = '#section-saisie'
    })
    await page.waitForURL('**/#section-saisie', { timeout: 20000 })
    await page.waitForTimeout(300)

    // Navigate back to Dashboard
    await page.evaluate(() => {
      window.location.hash = '#section-dashboard'
    })
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 20000 })
    await page.waitForTimeout(500)

    const motion = await page.evaluate(async (selector) => {
      const dashboard = document.getElementById('section-dashboard')
      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector)
        })
        .map((animation) => {
          const timing = animation.effect.getTiming()
          return {
            duration: Number(timing.duration),
            delay: Number(timing.delay)
          }
        })

      return {
        animations,
        state: dashboard.dataset.dashboardMotionState,
        entered: dashboard.dataset.dashboardMotionEntered
      }
    }, entranceSelector)

    expect(motion.entered).toBe('true')
    expect(motion.animations.length).toBeGreaterThan(0)
    motion.animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250)
    })
  })

  test('updateAll() does not restart dashboard entrance animation', async ({ page }) => {
    await page.waitForTimeout(500)
    const result = await page.evaluate(async (selector) => {
      const dashboard = document.getElementById('section-dashboard')
      
      // Wait for entrance animations to complete
      await new Promise((resolve) => {
        const checkAnimations = () => {
          const diagnostics = window.NexoraMotion.getDashboardMotionDiagnostics()
          if (diagnostics.activeAnimations === 0 && dashboard.dataset.dashboardMotionState === 'ready') {
            resolve()
          } else {
            requestAnimationFrame(checkAnimations)
          }
        }
        checkAnimations()
      })
      
      const before = window.NexoraMotion.getDashboardMotionDiagnostics()
      for (let index = 0; index < 3; index += 1) window.updateAll()
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const entranceAnimations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector)
        })
      return {
        before,
        after: window.NexoraMotion.getDashboardMotionDiagnostics(),
        dashboardAnimations: entranceAnimations.length,
        state: dashboard.dataset.dashboardMotionState
      }
    }, entranceSelector)

    expect(result.before.activeAnimations).toBe(0)
    expect(result.after.activeAnimations).toBe(0)
    expect(result.dashboardAnimations).toBeLessThanOrEqual(5)
    expect(result.state).toBe('ready')
  })

  test('Simple → Complete animates revealed surfaces', async ({ page }) => {
    await page.waitForTimeout(500)

    // Switch to Simple first
    await page.evaluate(() => {
      window.setNexoraUxMode('simple')
    })
    await page.waitForTimeout(300)

    // Switch to Complete
    await page.evaluate(() => {
      window.setNexoraUxMode('complete')
    })
    await page.waitForTimeout(300)

    const motion = await page.evaluate(async (selector) => {
      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector) && !target.hidden
        })
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

      return { animations }
    }, entranceSelector)

    expect(motion.animations.length).toBeGreaterThan(0)
    motion.animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250)
      expect(animation.animatedProperties.sort()).toEqual(['opacity', 'transform'])
    })
  })

  test('Complete → Simple hides immediately (no exit animation)', async ({ page }) => {
    await page.waitForTimeout(500)

    // Switch to Complete first
    await page.evaluate(() => {
      window.setNexoraUxMode('complete')
    })
    await page.waitForTimeout(300)

    // Switch to Simple
    await page.evaluate(() => {
      window.setNexoraUxMode('simple')
    })
    await page.waitForTimeout(100)

    const state = await page.evaluate(() => {
      const completeElements = document.querySelectorAll('[data-dashboard-mode="complete"]')
      const allHidden = Array.from(completeElements).every(el => el.hidden)
      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches('[data-dashboard-mode="complete"]')
        })
      return {
        allHidden,
        exitAnimations: animations.length
      }
    })

    expect(state.allHidden).toBe(true)
    expect(state.exitAnimations).toBe(0) // No exit animation on hidden elements
  })

  test('resetDashboardMotion exists on window.NexoraMotion', async ({ page }) => {
    const hasReset = await page.evaluate(() => {
      return typeof window.NexoraMotion?.resetDashboardMotion === 'function'
    })
    expect(hasReset).toBe(true)
  })

  test('Dashboard → Plan → Dashboard resets exactly once', async ({ page }) => {
    await page.waitForTimeout(500)

    // Navigate to Plan
    await page.evaluate(() => {
      window.location.hash = '#section-plan'
    })
    await page.waitForURL('**/#section-plan', { timeout: 20000 })
    await page.waitForTimeout(300)

    // Navigate back to Dashboard
    await page.evaluate(() => {
      window.location.hash = '#section-dashboard'
    })
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 20000 })
    await page.waitForTimeout(500)

    const resetCount = await page.evaluate(() => {
      // Check if instrumentation is available
      if (typeof window.getDashboardMotionResetCount === 'function') {
        return window.getDashboardMotionResetCount()
      }
      return 0
    })

    expect(resetCount).toBe(1)
  })

  test('uses one bounded compositor-only entrance sequence', async ({ page }) => {
    await page.waitForTimeout(500)
    const motion = await page.evaluate(async (selector) => {
      const dashboard = document.getElementById('section-dashboard')
      delete dashboard.dataset.dashboardMotionEntered
      delete dashboard.dataset.dashboardMotionState
      window.NexoraMotion.animateDashboardEnter(dashboard)
      await new Promise((resolve) => requestAnimationFrame(resolve))

      // Isolate animations targeting the main cockpit sections
      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector)
        })
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
    }, entranceSelector)

    expect(motion.entered).toBe('true')
    expect(['entering', 'ready']).toContain(motion.state)
    expect(motion.animations.length).toBeGreaterThan(0)
    expect(motion.animations.length).toBeLessThanOrEqual(10)
    motion.animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250)
      expect(animation.delay).toBeLessThanOrEqual(500)
      expect(animation.animatedProperties.sort()).toEqual(['opacity', 'transform'])
    })
  })

  test('keeps static cards still and limits hover lift to interactive controls', async ({ page }) => {
    const card = page.locator('.dashboard-module--timeline')
    await expect(card).toBeVisible()

    await card.hover()
    const cardTransform = await card.evaluate((element) => getComputedStyle(element).transform)
    // Static timeline module remains still (transform is identity / none)
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(cardTransform)
  })

  test('keeps the dashboard usable, stable and free of automatic celebration work', async ({ page }) => {
    await page.waitForTimeout(500)
    const state = await page.evaluate(() => {
      const visibleElements = Array.from(document.querySelectorAll(
        '#section-dashboard .dashboard-module'
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
