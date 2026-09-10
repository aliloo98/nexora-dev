import { test, expect } from '@playwright/test'

const v2Roots = '#hero-root, #priority-root, #trajectory-root, #jarvis-root'

async function loginDemo(page) {
  await page.goto('http://localhost:5180', { waitUntil: 'domcontentloaded' })
  await page.locator('#loginDemoBtn').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('#loginDemoBtn').click()
  await page.waitForURL('**/#section-dashboard', { timeout: 30000 })
  await page.locator('.dashboard-v2-cockpit').waitFor({ state: 'visible', timeout: 30000 })
  await expect(page.locator('#hero-root')).toBeVisible()
}

async function setMode(page, mode) {
  await page.evaluate((nextMode) => window.setNexoraUxMode(nextMode), mode)
  await expect(page.locator('body')).toHaveClass(mode === 'complete' ? /mode-complete/ : /mode-simple/)
}

async function expectDataIntegrity(page) {
  const integrity = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    invalid: document.body.innerText.match(/NaN|Infinity|undefined|null/g) || [],
    legacyRoots: document.querySelectorAll('#cockpit-financier-root, .jarvis-cockpit').length
  }))
  expect(integrity.overflow).toBe(false)
  expect(integrity.invalid).toEqual([])
  expect(integrity.legacyRoots).toBe(0)
}

async function expectNorthStar(page, { complete = false } = {}) {
  await expect(page.locator('.dashboard-v2-cockpit')).toBeVisible()
  await expect(page.locator('#hero-root')).toBeVisible()
  await expect(page.locator('#priority-root')).toBeVisible()
  await expect(page.locator('[aria-label="Priorité financière"]')).toBeVisible()

  if (complete) {
    await expect(page.locator('#trajectory-root')).toBeVisible()
    await expect(page.locator('#jarvis-root .jarvis-copilot')).toBeVisible()
    await expect(page.locator('#goal-progress-root')).toBeVisible()
    await expect(page.locator('#debts-summary-root')).toBeVisible()
  } else {
    await expect(page.locator('#trajectory-root')).toBeVisible()
    await expect(page.locator('#jarvis-root .jarvis-copilot')).toBeHidden()
  }

  await expectDataIntegrity(page)
}

test.describe('Dashboard Mode Superset', () => {
  test.beforeEach(async ({ page }) => {
    await loginDemo(page)
    await expect(page.evaluate(() => typeof window.setNexoraUxMode === 'function')).resolves.toBe(true)
  })

  test('mode simplifié displays North Star and hides Complete-only Jarvis', async ({ page }) => {
    await setMode(page, 'simple')
    await expectNorthStar(page)
  })

  test('mode complet displays the complete North Star cockpit', async ({ page }) => {
    await setMode(page, 'complete')
    await expectNorthStar(page, { complete: true })
  })

  test('mode toggle correctly switches between Simple and Complete', async ({ page }) => {
    await setMode(page, 'simple')
    await expectNorthStar(page)

    await setMode(page, 'complete')
    await expectNorthStar(page, { complete: true })

    await setMode(page, 'simple')
    await expectNorthStar(page)
  })

  test('complete mode is a strict superset of the visible Simple North Star', async ({ page }) => {
    await setMode(page, 'simple')
    const visibleSimple = await page.locator(v2Roots).evaluateAll((elements) => elements
      .filter((element) => element.offsetParent !== null)
      .map((element) => element.id))

    await setMode(page, 'complete')
    const visibleComplete = await page.locator(v2Roots).evaluateAll((elements) => elements
      .filter((element) => element.offsetParent !== null)
      .map((element) => element.id))

    expect(visibleSimple.length).toBeGreaterThan(0)
    expect(visibleComplete.length).toBeGreaterThan(visibleSimple.length)
    visibleSimple.forEach((id) => expect(visibleComplete).toContain(id))
  })

  test('mode persists across a Simple and Complete reload', async ({ page }) => {
    await setMode(page, 'simple')
    await page.reload()
    await page.locator('.dashboard-v2-cockpit').waitFor({ state: 'visible', timeout: 30000 })
    await expect(page.locator('body')).toHaveClass(/mode-simple/)
    await expectNorthStar(page)

    await setMode(page, 'complete')
    await page.reload()
    await page.locator('.dashboard-v2-cockpit').waitFor({ state: 'visible', timeout: 30000 })
    await expect(page.locator('body')).toHaveClass(/mode-complete/)
    await expectNorthStar(page, { complete: true })
  })

  test('Dashboard V2 exposes no legacy cockpit sections', async ({ page }) => {
    await setMode(page, 'complete')
    await expect(page.locator('#cockpit-financier-root')).toHaveCount(0)
    await expect(page.locator('.dashboard-module--timeline')).toHaveCount(0)
    await expect(page.locator('.dashboard-module--cockpit')).toHaveCount(0)
    await expectDataIntegrity(page)
  })
})
