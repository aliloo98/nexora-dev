import { test, expect } from '@playwright/test'

test.describe('Jarvis dashboard action buttons', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('priority, expense analysis and expense simulation actions work', async ({ page }) => {
    const consoleErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('#loginDemoBtn').click()
    await page.waitForURL('**/#section-dashboard')
    await page.waitForFunction(() => typeof window.setNexoraUxMode === 'function')
    await page.evaluate(() => window.setNexoraUxMode('complete'))
    await expect(page.locator('#jarvis-root .jarvis-copilot')).toHaveCount(1)
    await page.locator('[data-jarvis-copilot-open]').click()

    const input = page.locator('[data-jarvis-copilot-input]')
    await input.fill('Bonjour Jarvis')
    await page.locator('.jarvis-copilot-send').click()
    await expect(page.locator('.jarvis-copilot-response')).toHaveCount(1, { timeout: 15000 })
    const response = page.locator('.jarvis-copilot-response').first()
    await expect(response).toBeVisible()

    const action = (label) => response.locator('.jarvis-copilot-action', { hasText: label })

    await action('Voir la priorité').click()
    await expect(page.locator('.jarvis-copilot-response')).toHaveCount(2)
    await expect(page.locator('.jarvis-copilot-response').last()).toContainText(/Priorité|priorité/i)

    await action('Analyser les dépenses').click()
    await expect(page.locator('.jarvis-copilot-response').last()).toContainText(/dépense|poste|charges/i)

    await action('Simuler une dépense').click()
    const responses = page.locator('.jarvis-copilot-response')
    await expect(responses.last()).toContainText(/montant|simulation/i)

    await input.fill('Puis-je dépenser 300 € ?')
    await page.locator('.jarvis-copilot-send').click()
    const simulation = responses.last()
    await expect(simulation.locator('.jarvis-copilot-scenario')).toContainText('2 186')
    await expect(simulation.locator('.jarvis-copilot-scenario')).toContainText('1 886')
    await expect(simulation).toContainText('1 651')
    await expect(simulation).toContainText('1 351')
    expect(consoleErrors).toEqual([])
  })
})