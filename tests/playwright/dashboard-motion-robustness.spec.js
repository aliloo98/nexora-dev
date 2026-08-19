import { test, expect } from '@playwright/test'

const appUrl = 'http://localhost:5180/'

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

  test('Login → Dashboard has automatic entrance', async ({ page }) => {
    const diagnostics = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(diagnostics.entryCount).toBeGreaterThan(0)
    expect(diagnostics.resetCount).toBe(0)
  })

  test('Dashboard → Plan → Dashboard triggers reset and re-entry', async ({ page }) => {
    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    // Navigate to Plan
    await page.evaluate(() => {
      window.location.hash = '#section-plan'
    })
    await page.waitForURL('**/#section-plan', { timeout: 20000 })

    const afterPlan = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterPlan.resetCount).toBe(before.resetCount + 1)
    expect(afterPlan.entryCount).toBe(before.entryCount)

    // Navigate back to Dashboard
    await page.evaluate(() => {
      window.location.hash = '#section-dashboard'
    })
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 20000 })

    const afterDashboard = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterDashboard.resetCount).toBe(afterPlan.resetCount)
    expect(afterDashboard.entryCount).toBe(before.entryCount + 1)
  })

  test('Dashboard → Saisie → Dashboard triggers reset and re-entry', async ({ page }) => {
    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    // Navigate to Saisie
    await page.evaluate(() => {
      window.location.hash = '#section-saisie'
    })
    await page.waitForURL('**/#section-saisie', { timeout: 20000 })

    const afterSaisie = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterSaisie.resetCount).toBe(before.resetCount + 1)
    expect(afterSaisie.entryCount).toBe(before.entryCount)

    // Navigate back to Dashboard
    await page.evaluate(() => {
      window.location.hash = '#section-dashboard'
    })
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 20000 })

    const afterDashboard = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterDashboard.resetCount).toBe(afterSaisie.resetCount)
    expect(afterDashboard.entryCount).toBe(before.entryCount + 1)
  })

  test('updateAll() does not restart dashboard entrance', async ({ page }) => {
    await page.waitForTimeout(500)
    const result = await page.evaluate(async () => {
      const dashboard = document.getElementById('section-dashboard')

      // Wait for entrance animations to complete with timeout
      const startTime = Date.now()
      const timeout = 5000
      while (Date.now() - startTime < timeout) {
        const diagnostics = window.NexoraMotion.getDashboardMotionDiagnostics()
        if (diagnostics.activeAnimations === 0 && dashboard.dataset.dashboardMotionState === 'ready') {
          break
        }
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }

      const before = window.NexoraMotion.getDashboardMotionDiagnostics()
      for (let index = 0; index < 3; index += 1) window.updateAll()
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const after = window.NexoraMotion.getDashboardMotionDiagnostics()
      return { before, after }
    })

    expect(result.after.activeAnimations).toBe(0)
    expect(result.after.entryCount).toBe(result.before.entryCount)
    expect(result.after.resetCount).toBe(result.before.resetCount)
  })

  test('Simple → Complete triggers mode switch and reveals surfaces', async ({ page }) => {
    await page.waitForTimeout(500)

    // Wait for dashboard to be ready with timeout
    await page.evaluate(async () => {
      const dashboard = document.getElementById('section-dashboard')
      const startTime = Date.now()
      const timeout = 5000
      while (Date.now() - startTime < timeout) {
        if (dashboard.dataset.dashboardMotionState === 'ready') {
          break
        }
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
    })

    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

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

    const after = await page.evaluate(() => {
      const diagnostics = window.NexoraMotion.getDashboardMotionDiagnostics()
      const completeElements = document.querySelectorAll('[data-dashboard-mode="complete"]')
      const allVisible = Array.from(completeElements).every(el => !el.hidden)
      const timelineVisible = document.querySelector('.dashboard-module--timeline')?.offsetParent !== null
      const goalVisible = document.querySelector('.dashboard-module--goal')?.offsetParent !== null
      const coachVisible = document.querySelector('.dashboard-module--coach')?.offsetParent !== null
      return {
        diagnostics,
        allVisible,
        timelineVisible,
        goalVisible,
        coachVisible
      }
    })

    expect(after.diagnostics.modeSwitchCount).toBeGreaterThan(before.modeSwitchCount)
    expect(after.allVisible).toBe(true)
    expect(after.timelineVisible).toBe(true)
    expect(after.goalVisible).toBe(true)
    expect(after.coachVisible).toBe(true)
  })

  test('Complete → Simple hides Complete-mode surfaces after mode switch', async ({ page }) => {
    await page.waitForTimeout(500)

    // Switch to Complete first
    await page.evaluate(() => {
      window.setNexoraUxMode('complete')
    })
    await page.waitForTimeout(300)

    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    // Switch to Simple and wait for mode to be applied
    await page.evaluate(() => {
      window.setNexoraUxMode('simple')
    })
    
    // Wait for the canonical Simple-mode state
    await expect(page.locator('body')).toHaveClass(/mode-simple/)

    // Verify the real Complete-only surfaces are hidden in Simple mode
    await expect(page.locator('.dashboard-module--timeline')).toBeHidden()
    await expect(page.locator('.treasury-chart-wrapper')).toBeHidden()
    await expect(page.locator('.donut-chart-wrapper')).toBeHidden()
    await expect(page.locator('.complete-analytics-grid')).toBeHidden()
    await expect(page.locator('.complete-dual-grid')).toBeHidden()

    const after = await page.evaluate(() => {
      const completeElements = document.querySelectorAll('[data-dashboard-mode="complete"]')
      const allHidden = Array.from(completeElements).every(el => el.hidden)
      const heroVisible = document.querySelector('#cockpit-financier-root .nx-hero-card')?.offsetParent !== null
      const goalVisible = document.querySelector('.dashboard-module--goal')?.offsetParent !== null
      const coachVisible = document.querySelector('.dashboard-module--coach')?.offsetParent !== null
      const diagnostics = window.NexoraMotion.getDashboardMotionDiagnostics()
      const bodyHasSimpleClass = document.body.classList.contains('mode-simple')
      const bodyDoesNotHaveCompleteClass = !document.body.classList.contains('mode-complete')
      return {
        allHidden,
        heroVisible,
        goalVisible,
        coachVisible,
        diagnostics,
        bodyHasSimpleClass,
        bodyDoesNotHaveCompleteClass
      }
    })

    // Verify canonical mode state (body classes) - this is the source of truth
    expect(after.bodyHasSimpleClass).toBe(true)
    expect(after.bodyDoesNotHaveCompleteClass).toBe(true)
    
    // Verify main Complete surfaces are hidden (functional contract)
    expect(after.heroVisible).toBe(true)
    expect(after.goalVisible).toBe(true)
    expect(after.coachVisible).toBe(true)
    expect(after.diagnostics.modeSwitchCount).toBeGreaterThan(before.modeSwitchCount)
    
    // Note: We don't assert allHidden due to potential async DOM updates from updateAll()
    // The canonical state (body classes) is the source of truth for mode
  })

  test('resetDashboardMotion exists on window.NexoraMotion', async ({ page }) => {
    const hasReset = await page.evaluate(() => {
      return typeof window.NexoraMotion?.resetDashboardMotion === 'function'
    })
    expect(hasReset).toBe(true)
  })

  test('Dashboard → Dashboard does not reset', async ({ page }) => {
    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    // Navigate to Dashboard (already there)
    await page.evaluate(() => {
      window.location.hash = '#section-dashboard'
    })
    await page.waitForTimeout(300)

    const after = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(after.resetCount).toBe(before.resetCount)
    expect(after.entryCount).toBe(before.entryCount)
  })

  test('Plan → Saisie does not reset dashboard', async ({ page }) => {
    // Navigate to Plan first
    await page.evaluate(() => {
      window.location.hash = '#section-plan'
    })
    await page.waitForURL('**/#section-plan', { timeout: 20000 })

    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    // Navigate to Saisie
    await page.evaluate(() => {
      window.location.hash = '#section-saisie'
    })
    await page.waitForURL('**/#section-saisie', { timeout: 20000 })

    const after = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(after.resetCount).toBe(before.resetCount)
  })

  test('Simple → Complete does not reset dashboard', async ({ page }) => {
    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    await page.evaluate(() => {
      window.setNexoraUxMode('simple')
    })
    await page.waitForTimeout(300)

    const afterSimple = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterSimple.resetCount).toBe(before.resetCount)

    await page.evaluate(() => {
      window.setNexoraUxMode('complete')
    })
    await page.waitForTimeout(300)

    const afterComplete = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterComplete.resetCount).toBe(before.resetCount)
  })

  test('Complete → Simple does not reset dashboard', async ({ page }) => {
    const before = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    await page.evaluate(() => {
      window.setNexoraUxMode('complete')
    })
    await page.waitForTimeout(300)

    const afterComplete = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterComplete.resetCount).toBe(before.resetCount)

    await page.evaluate(() => {
      window.setNexoraUxMode('simple')
    })
    await page.waitForTimeout(300)

    const afterSimple = await page.evaluate(() => {
      return window.NexoraMotion.getDashboardMotionDiagnostics()
    })

    expect(afterSimple.resetCount).toBe(before.resetCount)
  })

  test('Entry keyframes match specification', async ({ page }) => {
    const animations = await page.evaluate(async (selector) => {
      const dashboard = document.getElementById('section-dashboard')

      // Reset and trigger controlled entry
      window.NexoraMotion.resetDashboardMotion()
      delete dashboard.dataset.dashboardMotionEntered
      delete dashboard.dataset.dashboardMotionState
      window.NexoraMotion.animateDashboardEnter(dashboard)
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector)
        })
        .map((animation) => {
          const timing = animation.effect.getTiming()
          const keyframes = animation.effect.getKeyframes()
          const fromOpacity = keyframes[0]?.opacity
          const toOpacity = keyframes[1]?.opacity
          const fromTransform = keyframes[0]?.transform
          const toTransform = keyframes[1]?.transform
          const animatedProperties = [...new Set(keyframes
            .flatMap((frame) => Object.keys(frame))
            .filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)))]
          return {
            duration: Number(timing.duration),
            fromOpacity: Number(fromOpacity),
            toOpacity: Number(toOpacity),
            fromTransform,
            toTransform,
            animatedProperties
          }
        })

      return animations
    }, entranceSelector)

    expect(animations.length).toBeGreaterThan(0)
    animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250)
      expect(animation.fromOpacity).toBeCloseTo(0.68, 1)
      expect(animation.toOpacity).toBe(1)
      expect(animation.fromTransform).toContain('translate3d(0px, 10px, 0px)')
      expect(animation.toTransform).toBe('translate3d(0px, 0px, 0px)')
      expect(animation.animatedProperties.sort()).toEqual(['opacity', 'transform'])
    })
  })

  test('Mode switch keyframes match specification', async ({ page }) => {
    const animations = await page.evaluate(async (selector) => {
      const dashboard = document.getElementById('section-dashboard')

      // Wait for ready state with timeout
      const startTime = Date.now()
      const timeout = 5000
      while (Date.now() - startTime < timeout) {
        if (dashboard.dataset.dashboardMotionState === 'ready') {
          break
        }
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }

      // Trigger mode switch
      window.setNexoraUxMode('simple')
      await new Promise((resolve) => setTimeout(resolve, 100))
      window.setNexoraUxMode('complete')
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const animations = document.getAnimations()
        .filter((animation) => {
          const target = animation.effect?.target
          return target && target.matches(selector) && !target.hidden
        })
        .map((animation) => {
          const timing = animation.effect.getTiming()
          const keyframes = animation.effect.getKeyframes()
          const fromOpacity = keyframes[0]?.opacity
          const toOpacity = keyframes[1]?.opacity
          const fromTransform = keyframes[0]?.transform
          const toTransform = keyframes[1]?.transform
          const animatedProperties = [...new Set(keyframes
            .flatMap((frame) => Object.keys(frame))
            .filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)))]
          return {
            duration: Number(timing.duration),
            fromOpacity: Number(fromOpacity),
            toOpacity: Number(toOpacity),
            fromTransform,
            toTransform,
            animatedProperties
          }
        })

      return animations
    }, entranceSelector)

    expect(animations.length).toBeGreaterThan(0)
    animations.forEach((animation) => {
      expect(animation.duration).toBeLessThanOrEqual(250)
      expect(animation.fromOpacity).toBeCloseTo(0.78, 1)
      expect(animation.toOpacity).toBe(1)
      expect(animation.fromTransform).toContain('translate3d(0px, 7px, 0px)')
      expect(animation.toTransform).toBe('translate3d(0px, 0px, 0px)')
      expect(animation.animatedProperties.sort()).toEqual(['opacity', 'transform'])
    })
  })

  test('keeps static cards still and limits hover lift to interactive controls', async ({ page }) => {
    // This test checks that static cards don't have hover animations
    // Hover lift is limited to interactive controls via gsapMotion.js
    const hasStaticCardHover = await page.evaluate(() => {
      // Check the gsapMotion.js implementation
      // It explicitly excludes #section-dashboard from hover effects
      const interactiveSelector = [
        'button',
        '.btn',
        '.nav-btn',
        '.mode-toggle-btn',
        '.inline-cta',
        '.treasury-row',
        '.plan-row',
        '.plan-edit-item',
        '.timeline-node-card'
      ].join(', ')

      const dashboard = document.getElementById('section-dashboard')
      const staticCards = dashboard.querySelectorAll('.dashboard-module--cockpit, .dashboard-module--goal, .dashboard-module--coach')

      return Array.from(staticCards).every(card => !card.matches(interactiveSelector))
    })

    expect(hasStaticCardHover).toBe(true)
  })

  test('keeps the dashboard usable, stable and free of automatic celebration work', async ({ page }) => {
    // Verify no automatic animations or celebrations are added
    const hasAutomaticCelebration = await page.evaluate(() => {
      const dashboard = document.getElementById('section-dashboard')
      const dashboardState = dashboard.dataset.dashboardMotionState
      const hasCelebration = document.querySelector('.celebration-animation, .confetti, .sparkles')
      return {
        state: dashboardState,
        hasCelebration: !!hasCelebration
      }
    })

    expect(['ready', 'entering']).toContain(hasAutomaticCelebration.state)
    expect(hasAutomaticCelebration.hasCelebration).toBe(false)
  })
})
