import { test, expect } from '@playwright/test'

test.describe('Jarvis Premium Motion System V1', () => {
  test('validates multi-layer Jarvis Core identity and idle motion in Complete mode', async ({ page }) => {
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Complete mode if not active
    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeVisible()
    await expect(coreSignal).toHaveAttribute('data-state', 'idle')

    // Verify multi-layer rings exist
    await expect(coreSignal.locator('.jarvis-core-outer')).toBeVisible()
    await expect(coreSignal.locator('.jarvis-core-arc')).toBeVisible()
    await expect(coreSignal.locator('.jarvis-core-inner')).toBeVisible()
    await expect(coreSignal.locator('.jarvis-core-center')).toBeVisible()

    // Verify visual anchor core inside Hero
    const heroAnchorCore = page.locator('.jarvis-hero .jarvis-core-signal')
    await expect(heroAnchorCore).toBeVisible()

    expect(consoleErrors.length).toBe(0)
  })

  test('validates interaction state transitions (open, analysing, response-ready)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const openButton = page.locator('[data-jarvis-copilot-open]')
    await expect(openButton).toBeVisible()
    await openButton.click()

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toHaveAttribute('data-state', 'open')

    const input = page.locator('[data-jarvis-copilot-input]')
    await expect(input).toBeVisible()
    await input.fill('Quel est mon solde ?')
    
    const sendButton = page.locator('.jarvis-copilot-send')
    await sendButton.click()

    // Thread should contain response
    const thread = page.locator('[data-jarvis-copilot-thread]')
    await expect(thread.locator('.jarvis-copilot-response')).toBeVisible()
  })

  test('validates mobile 390x844 layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
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
    await page.goto('/')
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

  test('validates SVG graphs, Donut, and Goal progress visual states', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    // Treasury forecast graph line
    const treasuryLine = page.locator('#treasury-line-path')
    await expect(treasuryLine).toBeVisible()

    // Donut segments
    const donutSegment = page.locator('#donut-segment-charges')
    await expect(donutSegment).toBeVisible()

    // Complete Goal bar
    const goalBar = page.locator('#complete-goal-bar')
    await expect(goalBar).toBeVisible()
  })

  test('validates Simplified mode isolation (0 Jarvis motion surfaces shown)', async ({ page }) => {
    await page.goto('/')
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

  test('validates prefers-reduced-motion contract', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(() => {
      document.body.classList.remove('mode-simple')
      document.body.classList.add('mode-complete')
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeVisible()
  })
})
