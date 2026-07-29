import { test, expect } from '@playwright/test'

test.describe('Dashboard Mode Superset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('mode simplifié displays simple cards and hides advanced KPIs', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await expect(page.locator('body')).toHaveClass(/mode-simple/)

    // Verify simple dashboard grid is visible
    const simpleGrid = page.locator('.simple-dashboard-grid')
    await expect(simpleGrid).toBeVisible()

    // Verify all simple cards are visible
    await expect(page.locator('#simple-card-restant')).toBeVisible()
    await expect(page.locator('#simple-card-entrant')).toBeVisible()
    await expect(page.locator('#simple-card-sortant')).toBeVisible()
    await expect(page.locator('#simple-card-objectif')).toBeVisible()

    // Verify advanced KPI strip is hidden
    const kpiStrip = page.locator('.dashboard-primary-kpis')
    await expect(kpiStrip).not.toBeVisible()
  })

  test('mode complet displays advanced KPIs and hides simple cards', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await expect(page.locator('body')).toHaveClass(/mode-complet/)

    // Verify simple dashboard grid is hidden
    const simpleGrid = page.locator('.simple-dashboard-grid')
    await expect(simpleGrid).not.toBeVisible()

    // Verify advanced KPI strip is visible
    const kpiStrip = page.locator('.dashboard-primary-kpis')
    await expect(kpiStrip).toBeVisible()

    // Verify advanced KPI cards are visible
    await expect(page.locator('#card-solde')).toBeVisible()
    await expect(page.locator('#card-epargne')).toBeVisible()
    await expect(page.locator('#card-taux')).toBeVisible()
  })

  test('mode complet displays all advanced elements not present in simple mode', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await expect(page.locator('body')).toHaveClass(/mode-complet/)

    // Verify advanced elements are visible
    const kpiStrip = page.locator('.dashboard-primary-kpis')
    await expect(kpiStrip).toBeVisible()

    const weekPlan = page.locator('.week-plan-card')
    await expect(weekPlan).toBeVisible()

    const primaryGoal = page.locator('#dashboard-primary-goal')
    await expect(primaryGoal).toBeVisible()

    const alerts = page.locator('#dashboard-alerts-card')
    await expect(alerts).toBeVisible()

    const quickView = page.locator('#dashboard-quick-view')
    await expect(quickView).toBeVisible()
  })

  test('mode simplifié hides advanced elements but keeps essential information', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    await expect(page.locator('body')).toHaveClass(/mode-simple/)

    // Verify simple cards provide essential information
    await expect(page.locator('#simple-card-restant')).toBeVisible()
    await expect(page.locator('#simple-card-entrant')).toBeVisible()
    await expect(page.locator('#simple-card-sortant')).toBeVisible()
    await expect(page.locator('#simple-card-objectif')).toBeVisible()

    // Verify advanced elements are hidden
    const kpiStrip = page.locator('.dashboard-primary-kpis')
    await expect(kpiStrip).not.toBeVisible()

    const weekPlan = page.locator('.week-plan-card')
    await expect(weekPlan).not.toBeVisible()

    const quickView = page.locator('#dashboard-quick-view')
    await expect(quickView).not.toBeVisible()
  })

  test('mode toggle correctly switches between simple and complete views', async ({ page }) => {
    // Start in simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    
    // Verify simple cards are visible
    await expect(page.locator('.simple-dashboard-grid')).toBeVisible()
    await expect(page.locator('.dashboard-primary-kpis')).not.toBeVisible()

    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'))
    
    // Verify simple cards are hidden and KPIs are visible
    await expect(page.locator('.simple-dashboard-grid')).not.toBeVisible()
    await expect(page.locator('.dashboard-primary-kpis')).toBeVisible()

    // Switch back to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'))
    
    // Verify simple cards are visible again
    await expect(page.locator('.simple-dashboard-grid')).toBeVisible()
    await expect(page.locator('.dashboard-primary-kpis')).not.toBeVisible()
  })
})
