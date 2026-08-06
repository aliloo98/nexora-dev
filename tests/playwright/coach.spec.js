import { test, expect } from '@playwright/test'

test.describe('Nexora Coach Dashboard pilot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/#section-dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
    await page.click('#loginDemoBtn')
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('#coach-action-root', {
      state: 'visible',
      timeout: 30000
    })
  })

  test('uses one Coach recommendation in complete and simplified modes', async ({ page }) => {
    const coachModule = page.locator('.dashboard-module--coach')

    await expect(coachModule).toBeVisible()
    await expect(page.locator('#coach-action-root')).toBeVisible()

    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await expect(page.locator('body')).toHaveClass(/mode-simple/)
    await expect(coachModule).toBeVisible()
    await expect(page.locator('#coach-action-root')).toBeVisible()

    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await expect(page.locator('body')).toHaveClass(/mode-complete/)
    await expect(coachModule).toBeVisible()
    await expect(page.locator('#coach-action-root')).toBeVisible()
  })
})
