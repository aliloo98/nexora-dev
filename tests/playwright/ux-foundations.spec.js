import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const appUrl = 'http://127.0.0.1:5180/#section-dashboard'

const formatViolations = (violations) => violations.map(({ id, impact, nodes }) => ({
  id,
  impact,
  targets: nodes.map((node) => node.target)
}))

async function openDemoApp(page) {
  await page.goto(appUrl)
  await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
  await page.click('#loginDemoBtn')
  await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
  await page.waitForSelector('#section-dashboard', { state: 'visible', timeout: 30000 })
}

test.describe('UX foundations', () => {
  test.use({ serviceWorkers: 'block' })

  test.beforeEach(async ({ page }) => {
    await openDemoApp(page)
  })

  test('confirmation traps focus, closes with Escape and restores focus without treasury content', async ({ page }) => {
    await page.locator('.nav-btn[data-section="parametres"]').click()
    const opener = page.getByRole('button', { name: 'Réinitialiser', exact: true })
    await opener.scrollIntoViewIfNeeded()
    await opener.focus()
    await opener.click()

    const dialog = page.getByRole('dialog', { name: 'Réinitialiser le mois' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog).toHaveAttribute('aria-labelledby', /.+/)
    await expect(dialog).toHaveAttribute('aria-describedby', /.+/)
    await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused()
    await expect(page.locator('#treasury-timeline-root')).toHaveCount(0)

    const confirm = dialog.getByRole('button', { name: 'Confirmer' })
    await confirm.focus()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Fermer la boîte de dialogue' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(confirm).toBeFocused()

    const accessibility = await new AxeBuilder({ page }).include('.nx-modal').analyze()
    expect(formatViolations(accessibility.violations)).toEqual([])

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('toast is a single polite announcement, keeps focus and respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const trigger = page.locator('.nav-btn[data-section="dashboard"]')
    await trigger.focus()
    await page.evaluate(() => {
      window.Utils.showToast('✅ Préférences enregistrées', { duration: 0 })
      window.Utils.showToast('✅ Préférences enregistrées', { duration: 0 })
    })

    const region = page.locator('.nx-toast-region')
    const toast = region.locator('.nx-toast').filter({ hasText: 'Préférences enregistrées' })
    await expect(region).toHaveAttribute('role', 'status')
    await expect(region).toHaveAttribute('aria-live', 'polite')
    await expect(toast).toHaveCount(1)
    await expect(toast).toContainText('Préférences enregistrées')
    await expect(trigger).toBeFocused()

    const transitionDurations = await toast.getByRole('button', { name: 'Fermer la notification' }).evaluate((element) => (
      getComputedStyle(element).transitionDuration
        .split(',')
        .map((duration) => duration.trim().endsWith('ms')
          ? parseFloat(duration)
          : parseFloat(duration) * 1000)
    ))
    expect(Math.max(...transitionDurations)).toBeLessThanOrEqual(1)

    const accessibility = await new AxeBuilder({ page }).include('.nx-toast-region').analyze()
    expect(formatViolations(accessibility.violations)).toEqual([])
  })

  test('voluntary navigation resets scroll and focuses the destination title', async ({ page }) => {
    await page.locator('.nav-btn[data-section="parametres"]').click()
    await page.evaluate(() => window.scrollTo(0, 900))
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    await page.locator('.nav-btn[data-section="saisie"]').click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.getByRole('heading', { name: 'Budget', level: 2 })).toBeFocused()
  })

  test('Back and Forward preserve browser-managed scroll positions', async ({ page }) => {
    // DIAGNOSTIC TEMPORAIRE - Capturer les valeurs de scroll pendant le test
    console.log('=== DÉBUT TEST SCROLL RESTORATION ===');
    
    await page.evaluate(() => {
      console.log('=== DANS page.evaluate() AVANT scrollRestoration ===');
      console.log('window.scrollY avant scrollRestoration:', window.scrollY);
      history.scrollRestoration = 'auto';
      console.log('window.scrollY après scrollRestoration:', window.scrollY);
      
      console.log('=== DANS page.evaluate() AVANT scrollTo(0, 700) ===');
      console.log('window.scrollY avant scrollTo(0, 700):', window.scrollY);
      window.scrollTo(0, 700);
      console.log('window.scrollY après scrollTo(0, 700):', window.scrollY);
      
      console.log('=== DANS page.evaluate() AVANT hash change ===');
      console.log('window.scrollY avant hash change:', window.scrollY);
      window.location.hash = '#section-parametres';
      console.log('window.scrollY après hash change:', window.scrollY);
    })
    
    await expect(page).toHaveURL(/#section-parametres$/)
    await expect(page.locator('#section-parametres')).toHaveClass(/active/)
    
    const scrollAfterFirstHash = await page.evaluate(() => window.scrollY);
    console.log('window.scrollY après navigation parametres:', scrollAfterFirstHash);
    
    await page.evaluate(() => window.scrollTo(0, 1200))
    
    const scrollAfterScroll = await page.evaluate(() => window.scrollY);
    console.log('window.scrollY après scrollTo(0, 1200):', scrollAfterScroll);
    
    console.log('=== AVANT page.goBack() ===');
    const scrollBeforeBack = await page.evaluate(() => window.scrollY);
    console.log('window.scrollY AVANT page.goBack():', scrollBeforeBack);
    
    await page.goBack()
    await expect(page).toHaveURL(/#section-dashboard$/)
    await expect(page.locator('#section-dashboard')).toHaveClass(/active/)
    
    const scrollAfterBack = await page.evaluate(() => window.scrollY);
    console.log('window.scrollY APRÈS page.goBack():', scrollAfterBack);
    
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    await page.goForward()
    await expect(page).toHaveURL(/#section-parametres$/)
    await expect(page.locator('#section-parametres')).toHaveClass(/active/)
    
    const scrollAfterForward = await page.evaluate(() => window.scrollY);
    console.log('window.scrollY APRÈS page.goForward():', scrollAfterForward);
    
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    
    console.log('=== FIN TEST SCROLL RESTORATION (GITHUB CI DIAGNOSTIC) ===');
  })

  test('Dashboard and Settings pass targeted axe scans', async ({ page }) => {
    const dashboard = await new AxeBuilder({ page }).include('#section-dashboard').analyze()
    expect(formatViolations(dashboard.violations)).toEqual([])

    await page.locator('.nav-btn[data-section="parametres"]').click()
    const settings = await new AxeBuilder({ page }).include('#section-parametres').analyze()
    expect(formatViolations(settings.violations)).toEqual([])
  })
})
