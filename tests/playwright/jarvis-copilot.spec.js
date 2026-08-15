import { test, expect } from '@playwright/test'

async function loginDemo(page) {
  await page.goto('http://localhost:5180/#section-dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
  await page.click('#loginDemoBtn')
  await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
  await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 30000 })
  await page.waitForFunction(() => typeof window.setNexoraUxMode === 'function')
}

async function setMode(page, mode) {
  await page.evaluate((nextMode) => window.setNexoraUxMode(nextMode), mode)
  await expect(page.locator('body')).toHaveClass(mode === 'complete' ? /mode-complete/ : /mode-simple/)
  if (mode === 'complete') {
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
  }
}

async function askJarvis(page, question) {
  const input = page.locator('[data-jarvis-copilot-input]')
  const previousCount = await page.locator('.jarvis-copilot-response').count()
  await input.fill(question)
  await input.press('Enter')
  await expect(page.locator('.jarvis-copilot-response')).toHaveCount(previousCount + 1)
  return page.locator('.jarvis-copilot-response').last()
}

async function openCopilot(page) {
  await page.locator('[data-jarvis-copilot-open]').click()
  await expect(page.locator('.jarvis-copilot')).toHaveAttribute('data-jarvis-copilot-state', 'open')
  await expect(page.locator('#jarvis-copilot-panel')).toBeVisible()
}

test.describe('Jarvis Copilot V1', () => {
  test.beforeEach(async ({ page }) => {
    await loginDemo(page)
    await setMode(page, 'complete')
  })

  test('1. Copilot visible in Complete only', async ({ page }) => {
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
    await expect(page.locator('#assistant-card')).toHaveCount(0)
  })

  test('2. Simplified mode preserves legacy Hero and excludes Copilot', async ({ page }) => {
    await setMode(page, 'simple')
    await expect(page.locator('.jarvis-copilot')).toHaveCount(0)
    await expect(page.locator('#cockpit-financier-root .nx-hero-card')).toHaveCount(1)
    await expect(page.locator('#assistant-card')).toHaveCount(1)
  })

  test('3. opens and closes with focus restoration', async ({ page }) => {
    const trigger = page.locator('[data-jarvis-copilot-open]')
    await trigger.focus()
    await trigger.press('Enter')
    await expect(page.locator('#jarvis-copilot-panel')).toBeVisible()
    await page.locator('[data-jarvis-copilot-close]').click()
    await expect(page.locator('#jarvis-copilot-panel')).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('4. quick prompt returns a structured brief', async ({ page }) => {
    await page.locator('.jarvis-copilot-prompt').first().click()
    const response = page.locator('.jarvis-copilot-response').last()
    await expect(response).toBeVisible()
    await expect(response.locator('.jarvis-copilot-response-head')).toBeVisible()
    await expect(response.locator('.jarvis-copilot-fact').first()).toBeVisible()
  })

  test('5. free-form status question works', async ({ page }) => {
    const response = await askJarvis(page, 'Comment va mon budget ?')
    await expect(response).toContainText(/Marge|Revenus|Dépenses/)
  })

  test('6. affordability renders scenario before and after', async ({ page }) => {
    const response = await askJarvis(page, 'Puis-je dépenser 100 € ?')
    await expect(response.locator('.jarvis-copilot-scenario')).toBeVisible()
    await expect(response).toContainText('Simulation')
    await expect(response).toContainText('Avant')
    await expect(response).toContainText('Après')
  })

  test('7. scenario does not mutate monthly data', async ({ page }) => {
    const before = await page.evaluate(async () => {
      const month = window.getMonth()
      return JSON.stringify((await window.MonthlyBudgetStateService.getMonthlyBudgetState(month)).data)
    })

    await askJarvis(page, 'Et si je dépense 200 € de plus ?')

    const after = await page.evaluate(async () => {
      const month = window.getMonth()
      return JSON.stringify((await window.MonthlyBudgetStateService.getMonthlyBudgetState(month)).data)
    })
    expect(after).toBe(before)
  })

  test('8. follow-up amount reuses affordability context', async ({ page }) => {
    await askJarvis(page, 'Puis-je dépenser 100 € ?')
    const response = await askJarvis(page, 'Et 200 € ?')
    await expect(response.locator('.jarvis-copilot-scenario')).toBeVisible()
    await expect(response).toContainText('200')
  })

  test('9. Complete to Simple removes Copilot and restores legacy assistant', async ({ page }) => {
    await askJarvis(page, 'Comment va mon budget ?')
    await setMode(page, 'simple')
    await expect(page.locator('.jarvis-copilot')).toHaveCount(0)
    await expect(page.locator('#assistant-card')).toHaveCount(1)
  })

  test('10. Simple to Complete restores one Copilot', async ({ page }) => {
    await setMode(page, 'simple')
    await setMode(page, 'complete')
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
    await expect(page.locator('#cockpit-financier-root .jarvis-cockpit')).toHaveCount(1)
    await expect(page.locator('#assistant-card')).toHaveCount(0)
  })

  test('11. refresh keeps one Copilot', async ({ page }) => {
    await page.evaluate(() => window.updateAll())
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
  })

  test('12. reload keeps Complete Copilot', async ({ page }) => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 30000 })
    await expect(page.locator('body')).toHaveClass(/mode-complete/)
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
  })

  test('13. month change refreshes Copilot without duplicates', async ({ page }) => {
    await page.evaluate(() => window.navigateBudgetMonth?.(-1))
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
    const response = await askJarvis(page, 'Comment va finir le mois ?')
    await expect(response).toContainText(/Prévision|projection|estimation/i)
  })

  test('14. reduced motion remains functional', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openCopilot(page)
    const response = await askJarvis(page, 'Quel est mon risque principal ?')
    await expect(response).toBeVisible()
  })

  test('15. keyboard submit supports Enter and Shift Enter', async ({ page }) => {
    await openCopilot(page)
    const input = page.locator('[data-jarvis-copilot-input]')
    await input.fill('Comment va')
    await input.press('Shift+Enter')
    await input.type(' mon budget ?')
    await input.press('Enter')
    await expect(page.locator('.jarvis-copilot-response').last()).toBeVisible()
  })

  test('16. mobile has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
    await openCopilot(page)
    await askJarvis(page, 'Puis-je dépenser 100 € ?')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBeFalsy()
  })

  test('17. no data state stays graceful', async ({ page }) => {
    await page.evaluate(async () => {
      await window.setNexoraDemoMode?.(false)
      const month = window.getMonth()
      const key = window.MonthlyBudgetStateService.getLocalStorageKey(month)
      window.SafeStorage?.setItem?.(key, JSON.stringify({}))
      await window.loadMonth?.()
      window.setNexoraUxMode('complete')
    })
    await expect(page.locator('#cockpit-financier-root .jarvis-copilot')).toHaveCount(1)
    const response = await askJarvis(page, 'Comment va mon budget ?')
    await expect(response).toContainText(/revenus|limitée|manque/i)
  })

  test('18. console, page errors and failed requests stay clean', async ({ page }) => {
    const consoleErrors = []
    const pageErrors = []
    const failedRequests = []

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('requestfailed', request => {
      const url = request.url()
      if (!/favicon|netlify|cloudflare/i.test(url)) failedRequests.push(url)
    })

    await askJarvis(page, 'Puis-je dépenser 100 € ?')
    await askJarvis(page, 'Pourquoi ?')

    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
    expect(failedRequests).toEqual([])
  })
})
