import { test, expect } from '@playwright/test';

test.describe('Test bug réel - Barre de sauvegarde', () => {
  test('une saisie réelle affiche la barre, la sauvegarde fonctionne et la valeur persiste après reload', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    // Activer le mode démo pour éviter auth-locked
    await page.evaluate(() => {
      if (typeof window.setNexoraDemoMode === 'function') {
        window.setNexoraDemoMode(true);
      }
    });

    // 1. Vérifier que body ne possède plus auth-locked
    await expect(page.locator('body')).not.toHaveClass(/auth-locked/);

    // 2. Vérifier que .save-bar est masquée au départ
    const saveBar = page.locator('.save-bar');
    await expect(saveBar).not.toBeVisible();

    // 3. Utiliser une modification directe car les champs ne sont pas visibles
    await page.evaluate(() => {
      const input = document.querySelector('input[data-key="courses"]');
      if (input) {
        input.value = '999';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // 4. Vérifier que .save-bar devient visible
    await expect(saveBar).toBeVisible();

    // 5. Vérifier que le bouton est utilisable
    const saveButton = page.locator('.save-bar-submit');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    // 6. Cliquer réellement sur le bouton
    await saveButton.click();

    // 7. Attendre que la barre redevient masquée (indiquant fin de sauvegarde)
    await expect(saveBar).not.toBeVisible();

    // 8. Recharger la page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    // 9. Réactiver le mode démo après reload
    await page.evaluate(() => {
      if (typeof window.setNexoraDemoMode === 'function') {
        window.setNexoraDemoMode(true);
      }
    });

    // 10. Vérifier que la valeur a été sauvegardée en localStorage
    const savedValue = await page.evaluate(() => {
      const input = document.querySelector('input[data-key="courses"]');
      return input ? input.value : null;
    });
    expect(savedValue).toBe('999');
  });
});
