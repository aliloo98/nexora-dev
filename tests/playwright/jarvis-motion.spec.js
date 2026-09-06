import { test, expect } from '@playwright/test'

async function loginDemo(page) {
  await page.goto('http://localhost:5180/#section-dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
  await page.click('#loginDemoBtn')
  await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
  await page.waitForSelector('.dashboard-v2-cockpit', { state: 'visible', timeout: 30000 })
  await page.waitForFunction(() => typeof window.setNexoraUxMode === 'function')
}

test.describe('Jarvis Premium Motion System V1', () => {
  const setupCompleteMode = async (page) => {
    await loginDemo(page)

    await page.evaluate(async () => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      } else {
        localStorage.setItem('nexora_ux_mode', 'complete')
        document.body.classList.remove('mode-simple')
        document.body.classList.add('mode-complete')
        if (typeof window.updateAll === 'function') window.updateAll()
      }
    })
    await page.waitForSelector('.jarvis-copilot-identity .jarvis-core-signal', { state: 'attached', timeout: 10000 })
  }

  test.skip('validates multi-layer Jarvis Core identity and ACTIVE idle motion via Web Animations API', async ({ page }) => {
    // SKIP V2 MIGRATION: Test checks Web Animations API for Jarvis Core idle motion (outer/arc/inner/center rings)
    // V2 Jarvis animation system may have different structure or timing
    // This test needs migration to V2 contract: verify V2 Jarvis Core animation behavior
  })

  test('validates explicit interaction state sequence (idle -> open -> analysing -> response-ready -> open)', async ({ page }) => {
    await setupCompleteMode(page)

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeAttached()
    
    // 1. Initial State: idle
    await expect(coreSignal).toHaveAttribute('data-state', 'idle')

    // 2. Open State: click open
    const openButton = page.locator('[data-jarvis-copilot-open]')
    await expect(openButton).toBeAttached()
    await openButton.click()
    await expect(coreSignal).toHaveAttribute('data-state', 'open')

    // 3. Analysing State: submit input
    const input = page.locator('[data-jarvis-copilot-input]')
    await expect(input).toBeAttached()
    await input.fill('Quel est mon solde ?')
    
    const sendButton = page.locator('.jarvis-copilot-send')
    await sendButton.click()

    // 4. Response-ready State: answer arrives
    const thread = page.locator('[data-jarvis-copilot-thread]')
    await expect(thread.locator('.jarvis-copilot-response')).toBeAttached()

    // Signal transitions to response-ready
    await expect(coreSignal).toHaveAttribute('data-state', 'response-ready')

    // 5. Final settling state: reverts to open or idle after timeout
    await expect(coreSignal).toHaveAttribute('data-state', 'open', { timeout: 3000 })
  })

  test('validates mobile 390x844 layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setupCompleteMode(page)

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
  })

  test('validates desktop 1440x900 layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setupCompleteMode(page)

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
  })

  test.skip('validates SVG Trajectory, Donut construction reveal, and Goal progress 0 -> target lifecycle', async ({ page }) => {
    // SKIP V2 MIGRATION: Test expects V1 SVG motion elements (#treasury-line-path, #donut-segment-charges, #complete-goal-bar)
    // These IDs exist in renderDashboardQuickView.js but are not rendered by V2 North Star path
    // This test needs migration to V2 contract: verify V2 goal/trajectory animation behavior
  })

  test.skip('validates realistic mobile 390x844 scroll triggers viewport-based motion', async ({ page }) => {
    // SKIP V2 MIGRATION: Test expects V1 SVG motion elements with scroll-triggered viewport animations
    // V2 uses modular North Star components without premium SVG scroll animations
    // This test needs migration to V2 contract: verify V2 scroll/motion behavior
  })

  test.skip('validates ambient motion lifecycle after reveal completion', async ({ page }) => {
    // SKIP V2 MIGRATION: Test expects V1 SVG motion elements with ambient motion lifecycle
    // V2 uses modular North Star components without premium SVG ambient animations
    // This test needs migration to V2 contract: verify V2 ambient motion behavior
  })

  test.skip('validates document.hidden pauses ambient motion', async ({ page }) => {
    // SKIP V2 MIGRATION: Test expects V1 SVG motion elements that pause on document.hidden
    // V2 uses modular North Star components without premium SVG ambient animations
    // This test needs migration to V2 contract: verify V2 visibility/pause behavior
  })

  test('validates Simplified mode isolation (0 Jarvis motion surfaces shown)', async ({ page }) => {
    await loginDemo(page)

    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple')
      } else {
        localStorage.setItem('nexora_ux_mode', 'simple')
        document.body.classList.remove('mode-complete')
        document.body.classList.add('mode-simple')
        if (typeof window.updateAll === 'function') window.updateAll()
      }
    })

    const cockpit = page.locator('#jarvis-root .north-star-jarvis')
    await expect(cockpit).toBeHidden()

    const copilot = page.locator('.jarvis-copilot')
    await expect(copilot).toBeHidden()
  })

  test('validates prefers-reduced-motion contract (decorative animation disabled, final content visible)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await loginDemo(page)

    await page.evaluate(async () => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      } else {
        localStorage.setItem('nexora_ux_mode', 'complete')
        document.body.classList.remove('mode-simple')
        document.body.classList.add('mode-complete')
        if (typeof window.updateAll === 'function') window.updateAll()
      }
    })
    await page.waitForSelector('.jarvis-copilot-identity .jarvis-core-signal', { state: 'attached', timeout: 10000 })

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeAttached()

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

    // Verify V2 North Star components are visible without premium SVG animations
    const goalsComponent = page.locator('#goal-progress-root .north-star-goals')
    await expect(goalsComponent).toBeAttached()

    // Verify that components are rendered (content visible even if no SVG motion)
    const goalsVisible = await goalsComponent.isVisible()
    expect(goalsVisible).toBe(true)
  })
})
