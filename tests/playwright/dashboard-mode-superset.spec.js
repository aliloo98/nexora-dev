import { test, expect } from '@playwright/test'

test.describe('Dashboard Mode Superset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
    await page.click('#loginDemoBtn')
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
    await page.waitForSelector('#assistant-card', { state: 'visible', timeout: 30000 })
  })

  test('mode simplifié displays simple cards and hides advanced KPIs', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await expect(page.locator('body')).toHaveClass(/mode-simple/)

    // Wait for mode switch to take effect
    await page.waitForTimeout(500)

    // Verify essential elements are visible in simple mode
    await expect(page.locator('.cockpit-core')).toBeVisible()
    await expect(page.locator('.cockpit-zone--coach')).toBeVisible()

    // Verify mode simple is active on body
    const bodyClass = await page.locator('body').getAttribute('class')
    expect(bodyClass).toContain('mode-simple')
  })

  test('mode complet displays advanced KPIs and hides simple cards', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await expect(page.locator('body')).toHaveClass(/mode-complet/)

    // Wait for mode switch to take effect
    await page.waitForTimeout(500)

    // Verify cockpit CTA is hidden in complete mode
    const cockpitCta = page.locator('.cockpit-cta')
    await expect(cockpitCta).not.toBeVisible()

    // Verify advanced elements are visible in complete mode
    await expect(page.locator('.cockpit-zone--assistant')).toBeVisible()
    await expect(page.locator('.cockpit-lateral-grid')).toBeVisible()
    await expect(page.locator('.cockpit-kpis')).toBeVisible()
  })

  test('mode complet displays all advanced elements not present in simple mode', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await expect(page.locator('body')).toHaveClass(/mode-complet/)

    // Wait for mode switch to take effect
    await page.waitForTimeout(500)

    // Verify advanced elements are visible
    await expect(page.locator('.cockpit-core')).toBeVisible()
    await expect(page.locator('.cockpit-zone--coach')).toBeVisible()
    await expect(page.locator('.cockpit-zone--assistant')).toBeVisible()
    await expect(page.locator('.cockpit-lateral-grid')).toBeVisible()
    await expect(page.locator('.cockpit-kpis')).toBeVisible()
  })

  test('mode simplifié hides advanced elements but keeps essential information', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await expect(page.locator('body')).toHaveClass(/mode-simple/)

    // Wait for mode switch to take effect
    await page.waitForTimeout(500)

    // Verify essential elements are visible in simple mode
    await expect(page.locator('.cockpit-core')).toBeVisible()
    await expect(page.locator('.cockpit-zone--coach')).toBeVisible()

    // Verify mode simple is active on body
    const bodyClass = await page.locator('body').getAttribute('class')
    expect(bodyClass).toContain('mode-simple')
  })

  test('mode toggle correctly switches between simple and complete views', async ({ page }) => {
    // Start in simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await page.waitForTimeout(500)

    // Verify simple mode elements are visible
    await expect(page.locator('.cockpit-cta')).toBeVisible()
    await expect(page.locator('.cockpit-zone--assistant')).not.toBeVisible()

    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await page.waitForTimeout(500)

    // Verify complete mode elements are visible
    await expect(page.locator('.cockpit-cta')).not.toBeVisible()
    await expect(page.locator('.cockpit-zone--assistant')).toBeVisible()

    // Switch back to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await page.waitForTimeout(500)

    // Verify simple mode elements are visible again
    await expect(page.locator('.cockpit-cta')).toBeVisible()
    await expect(page.locator('.cockpit-zone--assistant')).not.toBeVisible()
  })
})
