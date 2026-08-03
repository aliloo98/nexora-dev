import { expect, test } from '@playwright/test';

const user = {
  id: 'current_month_user',
  email: 'current-month@nexora.local',
  user_metadata: { username: 'current-month' },
  created_at: '2026-08-03T08:00:00.000Z',
  email_confirmed_at: '2026-08-03T08:00:00.000Z'
};

const session = {
  access_token: 'current_month_access',
  refresh_token: 'current_month_refresh',
  expires_in: 3600,
  expires_at: 1924992000,
  user
};

const monthlyData = {
  '2026-05': { rev_ali: '1505', rev_megane: '1000', loyer: '605' },
  '2026-07': { rev_ali: '1707', rev_megane: '1200', loyer: '707' },
  '2026-08': { rev_ali: '1808', rev_megane: '1300', loyer: '808' }
};

test.describe('Current budget month initialization', () => {
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-08-03T10:00:00+02:00'));
    await page.addInitScript(({ user, session, monthlyData }) => {
      localStorage.setItem('nexora_auth_user', JSON.stringify(user));
      localStorage.setItem('nexora_auth_session', JSON.stringify(session));
      sessionStorage.setItem('nexora_auth_user', JSON.stringify(user));
      sessionStorage.setItem('nexora_auth_session', JSON.stringify(session));
      Object.entries(monthlyData).forEach(([month, data]) => {
        localStorage.setItem(`budget_${user.id}_${month}`, JSON.stringify(data));
      });
      localStorage.setItem(`nexora_budget_cycle_settings_v1::user:${user.id}`, JSON.stringify({
        mode: 'calendar',
        startDay: 1,
        endDay: 31,
        updatedAt: '2026-08-03T08:00:00.000Z'
      }));
    }, { user, session, monthlyData });
  });

  test('opens August, preserves history, supports July navigation, and resets to August after restart', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#monthSelect')).toHaveValue('2026-08');
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('1808');

    await page.locator('#monthSelect').selectOption('2026-07');
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('1707');

    await page.locator('#monthSelect').selectOption('2026-08');
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('1808');

    const preservedHistory = await page.evaluate(({ userId, expected }) => {
      return Object.fromEntries(Object.keys(expected).map(month => [
        month,
        JSON.parse(localStorage.getItem(`budget_${userId}_${month}`) || 'null')
      ]));
    }, { userId: user.id, expected: monthlyData });
    expect(preservedHistory).toEqual(monthlyData);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#monthSelect')).toHaveValue('2026-08');
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('1808');
  });

  test('restores a backup month without changing the next startup month', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#monthSelect')).toHaveValue('2026-08');

    await page.locator('#json-import-input').setInputFiles({
      name: 'nexora-backup-test.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        __nexora_backup: { format: 'nexora-backup', version: 1 },
        'budget_2026-09': { rev_ali: '1909', rev_megane: '1400', loyer: '909' }
      }))
    });

    await expect(page.locator('#monthSelect')).toHaveValue('2026-09');
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('1909');
    await expect.poll(async () => page.evaluate(() => {
      return JSON.parse(localStorage.getItem('budget_current_month_user_2026-09') || '{}').rev_ali;
    })).toBe('1909');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#monthSelect')).toHaveValue('2026-08');
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('1808');
    await expect.poll(async () => page.evaluate(() => {
      return JSON.parse(localStorage.getItem('budget_current_month_user_2026-09') || '{}').rev_ali;
    })).toBe('1909');
  });

  test('uses the ending month of the custom cycle containing today', async ({ page }) => {
    await page.addInitScript(({ userId }) => {
      localStorage.setItem(`nexora_budget_cycle_settings_v1::user:${userId}`, JSON.stringify({
        mode: 'custom',
        startDay: 28,
        endDay: 27,
        updatedAt: '2026-08-03T08:00:00.000Z'
      }));
    }, { userId: user.id });

    await page.goto('http://127.0.0.1:5180/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#monthSelect')).toHaveValue('2026-08');
    await expect(page.locator('#budget-cycle-caption')).toContainText('28 juillet');
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('1808');
  });
});
