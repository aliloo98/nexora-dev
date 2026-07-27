import { test, expect } from '@playwright/test'

test.describe('Nexora Coach Dashboard pilot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/#section-dashboard')
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
    await page.click('#loginDemoBtn')
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('#dashboard-master-root .nx-coach-card', {
      state: 'visible',
      timeout: 30000
    })
  })

  test('uses one Coach recommendation in complete and simplified modes', async ({ page }) => {
    const coachCard = page.locator('#dashboard-master-root .nx-coach-card')

    await expect(coachCard).toBeVisible()
    await expect(page.locator('#dashboard-master-root .nx-coach-card__action')).toHaveCount(1)

    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await expect(page.locator('body')).toHaveClass(/mode-simple/)
    await expect(coachCard).toBeVisible()
    await expect(page.locator('#dashboard-master-root .nx-coach-card__action')).toHaveCount(1)

    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await expect(page.locator('body')).toHaveClass(/mode-complet/)
    await expect(coachCard).toBeVisible()
    await expect(page.locator('#dashboard-master-root .nx-coach-card__action')).toHaveCount(1)
  })
})
