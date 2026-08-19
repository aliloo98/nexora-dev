import { test, expect } from '@playwright/test'

const baseUrl = 'http://localhost:5180/'

test.describe('Jarvis Premium Motion System V1', () => {
  test('validates multi-layer Jarvis Core identity and ACTIVE idle motion via Web Animations API', async ({ page }) => {
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto(baseUrl)
    await page.waitForLoadState('domcontentloaded')

    // Switch to Complete mode
    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeVisible()
    await expect(coreSignal).toHaveAttribute('data-state', 'idle')

    // Verify multi-layer rings exist
    const outerRing = coreSignal.locator('.jarvis-core-outer')
    const arcRing = coreSignal.locator('.jarvis-core-arc')
    const innerRing = coreSignal.locator('.jarvis-core-inner')
    const centerCore = coreSignal.locator('.jarvis-core-center')

    await expect(outerRing).toBeVisible()
    await expect(arcRing).toBeVisible()
    await expect(innerRing).toBeVisible()
    await expect(centerCore).toBeVisible()

    // Web Animations API runtime proof: verify active running CSS keyframe animations
    const animationsProof = await coreSignal.evaluate((signalEl) => {
      const getRunning = (selector) => {
        const el = signalEl.querySelector(selector)
        if (!el) return []
        return el.getAnimations().map(a => ({
          playState: a.playState
        }))
      }
      return {
        outer: getRunning('.jarvis-core-outer'),
        arc: getRunning('.jarvis-core-arc'),
        inner: getRunning('.jarvis-core-inner'),
        center: getRunning('.jarvis-core-center')
      }
    })

    expect(animationsProof.outer.some(a => a.playState === 'running')).toBe(true)
    expect(animationsProof.arc.some(a => a.playState === 'running')).toBe(true)
    expect(animationsProof.inner.some(a => a.playState === 'running')).toBe(true)
    expect(animationsProof.center.some(a => a.playState === 'running')).toBe(true)

    // Verify visual anchor core inside Hero
    const heroAnchorCore = page.locator('.jarvis-hero .jarvis-core-signal')
    await expect(heroAnchorCore).toBeVisible()

    expect(consoleErrors.length).toBe(0)
  })

  test('validates explicit interaction state sequence (idle -> open -> analysing -> response-ready -> open)', async ({ page }) => {
    await page.goto(baseUrl)
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    
    // 1. Initial State: idle
    await expect(coreSignal).toHaveAttribute('data-state', 'idle')

    // 2. Open State: click open
    const openButton = page.locator('[data-jarvis-copilot-open]')
    await expect(openButton).toBeVisible()
    await openButton.click()
    await expect(coreSignal).toHaveAttribute('data-state', 'open')

    // 3. Analysing State: submit input
    const input = page.locator('[data-jarvis-copilot-input]')
    await expect(input).toBeVisible()
    await input.fill('Quel est mon solde ?')
    
    const sendButton = page.locator('.jarvis-copilot-send')
    await sendButton.click()

    // 4. Response-ready State: answer arrives
    const thread = page.locator('[data-jarvis-copilot-thread]')
    await expect(thread.locator('.jarvis-copilot-response')).toBeVisible()

    // Signal transitions to response-ready
    await expect(coreSignal).toHaveAttribute('data-state', 'response-ready')

    // 5. Final settling state: reverts to open or idle after timeout
    await expect(coreSignal).toHaveAttribute('data-state', 'open', { timeout: 3000 })
  })

  test('validates mobile 390x844 layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(baseUrl)
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
  })

  test('validates desktop 1440x900 layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(baseUrl)
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
  })

  test('validates SVG Trajectory, Donut construction reveal, and Goal progress 0 -> target lifecycle', async ({ page }) => {
    await page.goto(baseUrl)
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    // 1. Treasury forecast graph line path reveal
    const treasuryLine = page.locator('#treasury-line-path')
    await expect(treasuryLine).toBeVisible()
    await expect(treasuryLine).toHaveAttribute('data-motion-state', 'complete')
    
    const lineD = await treasuryLine.getAttribute('d')
    expect(lineD).toBeTruthy()
    expect(lineD.startsWith('M 0,')).toBe(true)

    // 2. Donut segments construction reveal
    const donutSegment = page.locator('#donut-segment-charges')
    await expect(donutSegment).toBeVisible()
    await expect(donutSegment).toHaveAttribute('data-motion-state', 'complete')

    // 3. Goal progress bar 0 -> target fill reveal
    const goalBar = page.locator('#complete-goal-bar')
    await expect(goalBar).toBeVisible()
    await expect(goalBar).toHaveAttribute('data-motion-state', 'complete')

    const goalBarWidth = await goalBar.evaluate(el => el.style.width)
    expect(goalBarWidth).not.toBe('0%')
    expect(goalBarWidth.endsWith('%')).toBe(true)

    // 4. Verify calling updateAll does NOT reset motion state back to pending
    await page.evaluate(() => {
      if (typeof window.updateAll === 'function') window.updateAll()
    })
    await expect(goalBar).toHaveAttribute('data-motion-state', 'complete')
    await expect(treasuryLine).toHaveAttribute('data-motion-state', 'complete')
    await expect(donutSegment).toHaveAttribute('data-motion-state', 'complete')
  })

  test('validates Simplified mode isolation (0 Jarvis motion surfaces shown)', async ({ page }) => {
    await page.goto(baseUrl)
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-complete')
      document.body.classList.add('mode-simple')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const cockpit = page.locator('.jarvis-cockpit')
    await expect(cockpit).toBeHidden()

    const copilot = page.locator('.jarvis-copilot')
    await expect(copilot).toBeHidden()
  })

  test('validates prefers-reduced-motion contract (decorative animation disabled, final content visible)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(baseUrl)
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeVisible()

    // Web Animations API proof: verify no running decorative keyframe animation under prefers-reduced-motion
    const runningAnimations = await coreSignal.evaluate((signalEl) => {
      const getRunning = (selector) => {
        const el = signalEl.querySelector(selector)
        if (!el) return []
        return el.getAnimations().filter(a => a.playState === 'running')
      }
      return [
        ...getRunning('.jarvis-core-outer'),
        ...getRunning('.jarvis-core-arc'),
        ...getRunning('.jarvis-core-inner'),
        ...getRunning('.jarvis-core-center')
      ].length
    })

    expect(runningAnimations).toBe(0)

    // Verify all graph and goal final data states remain 100% visible
    const treasuryLine = page.locator('#treasury-line-path')
    await expect(treasuryLine).toBeVisible()

    const donutSegment = page.locator('#donut-segment-charges')
    await expect(donutSegment).toBeVisible()

    const goalBar = page.locator('#complete-goal-bar')
    await expect(goalBar).toBeVisible()
    const goalWidth = await goalBar.evaluate(el => el.style.width)
    expect(goalWidth).not.toBe('0%')
  })
})
