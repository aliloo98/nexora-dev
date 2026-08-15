import { test, expect } from '@playwright/test'

const catalogueUrl = 'http://localhost:5180/nexora-ui-v2.html'

test.describe('Nexora UI V2 catalogue', () => {
  test('remains stable at 390, 768 and 1440 pixels', async ({ page }, testInfo) => {
    const viewports = [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 1000 }
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(catalogueUrl, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Nexora UI V2', level: 1 })).toBeVisible()
      await expect(page.locator('.nx-coach-card')).toBeVisible()
      await expect(page.locator('.nx-goal-card')).toBeVisible()

      const layout = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
        scopeOverflow: document.querySelector('.nx-catalog')?.scrollWidth
          > document.querySelector('.nx-catalog')?.clientWidth + 1
      }))
      expect(layout.documentOverflow, `document overflow at ${viewport.width}px`).toBeFalsy()
      expect(layout.scopeOverflow, `catalogue overflow at ${viewport.width}px`).toBeFalsy()

      const undersizedControls = await page.locator(
        '.nx-button:not([hidden]), .nx-chip:not([hidden]), .nx-field__control:not([hidden])'
      ).evaluateAll((elements) => elements
        .map((element) => {
          const box = element.getBoundingClientRect()
          if (box.width === 0 && box.height === 0) return null
          return { width: box.width, height: box.height, label: element.textContent?.trim() }
        })
        .filter((box) => box && (box.width < 44 || box.height < 44)))
      expect(undersizedControls, `undersized controls at ${viewport.width}px`).toEqual([])

      await page.screenshot({
        path: testInfo.outputPath(`nexora-ui-v2-${viewport.name}.png`),
        fullPage: true
      })
    }
  })

  test('supports keyboard modal flow, focus restoration and toast announcements', async ({ page }) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 1440, height: 1000 }
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto(catalogueUrl, { waitUntil: 'domcontentloaded' })
      const opener = page.locator('#nx-catalog-open-modal')
      await opener.focus()
      await expect(opener).toBeFocused()
      await page.keyboard.press('Enter')

      const dialog = page.getByRole('dialog', { name: 'Confirmer l’action' })
      await expect(dialog).toBeVisible()
      await expect(page.locator('#catalog-modal-input')).toBeFocused()

      const confirm = dialog.getByRole('button', { name: 'Confirmer' })
      await confirm.focus()
      await page.keyboard.press('Tab')
      await expect(dialog.getByRole('button', { name: 'Fermer la boîte de dialogue' })).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()

      const toastTrigger = page.locator('#nx-catalog-show-toast')
      await toastTrigger.click()
      const toast = page.locator('.nx-toast')
      await expect(toast).toContainText('Les préférences ont été enregistrées.')
      await expect(page.locator('.nx-toast-region')).toHaveAttribute('role', 'status')
      await expect(page.locator('.nx-toast-region')).toHaveAttribute('aria-live', 'polite')
      await toast.getByRole('button', { name: 'Fermer la notification' }).click()
      await expect(toast).toHaveCount(0)
    }
  })

  test('exposes visible keyboard focus and honors reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(catalogueUrl, { waitUntil: 'domcontentloaded' })
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
    const outline = await focused.evaluate((element) => ({
      style: getComputedStyle(element).outlineStyle,
      width: parseFloat(getComputedStyle(element).outlineWidth)
    }))
    expect(outline.style).not.toBe('none')
    expect(outline.width).toBeGreaterThanOrEqual(2)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const transitionDurations = await page.locator('.nx-button').first().evaluate((element) =>
      getComputedStyle(element).transitionDuration
        .split(',')
        .map((duration) => duration.trim().endsWith('ms')
          ? parseFloat(duration)
          : parseFloat(duration) * 1000)
    )
    expect(Math.max(...transitionDurations)).toBeLessThanOrEqual(1)
  })
})
