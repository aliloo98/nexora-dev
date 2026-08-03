import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';

const user = {
  id: 'export_trace_user',
  email: 'export@nexora.local',
  user_metadata: { username: 'export' },
  created_at: '2026-08-03T08:00:00.000Z',
  email_confirmed_at: '2026-08-03T08:00:00.000Z'
};

const session = {
  access_token: 'export_trace_access',
  refresh_token: 'export_trace_refresh',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user
};

test.describe('Budget source parity and premium exports', () => {
  test.use({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ user, session }) => {
      localStorage.setItem('nexora_auth_user', JSON.stringify(user));
      localStorage.setItem('nexora_auth_session', JSON.stringify(session));
      sessionStorage.setItem('nexora_auth_user', JSON.stringify(user));
      sessionStorage.setItem('nexora_auth_session', JSON.stringify(session));
      localStorage.setItem('budget_export_trace_user_2026-05', JSON.stringify({
        rev_ali: '1800',
        rev_megane: '1300',
        loyer: '700',
        credit: '200'
      }));
      localStorage.setItem('nexora_recurring_incomes::user:export_trace_user', JSON.stringify([
        {
          id: 'income-ali',
          name: 'Salaire Ali',
          amount: 2110,
          linkedCharge: 'rev_ali',
          updated_at: '2026-08-03T10:00:00.000Z'
        },
        {
          id: 'income-megane',
          name: 'Salaire Mégane',
          amount: 1300,
          linkedCharge: 'rev_megane',
          updated_at: '2026-08-03T10:00:00.000Z'
        }
      ]));
      localStorage.setItem('nexora_bill_schedules::user:export_trace_user', JSON.stringify([
        {
          id: 'bill-loyer',
          name: 'Loyer',
          amount: 650,
          linkedCharge: 'loyer',
          updated_at: '2026-08-03T10:00:00.000Z'
        },
        {
          id: 'bill-credit',
          name: 'Crédit',
          amount: 200,
          linkedCharge: 'credit',
          updated_at: '2026-08-03T10:00:00.000Z'
        }
      ]));
    }, { user, session });

    await page.goto('http://127.0.0.1:5180/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.initLegacyBudgetUi === 'function');
    await page.evaluate(() => window.initLegacyBudgetUi());
    await page.waitForFunction(() => document.querySelector('[data-key="rev_ali"]')?.value === '1800');
  });

  test('Dashboard, Analytics, PDF and Excel retain live DOM totals until explicit recurring application', async ({ page }) => {
    const before = await page.evaluate(async () => {
      const month = document.getElementById('monthSelect').value;
      const metrics = window.getMonthMetrics(month, { fromDom: true });
      const pdfData = window.NexoraPdfExport.collectBudgetData();
      const pdf = await window.NexoraPdfExport.generateMonthlyBudgetPdfPremium();
      const pdfBytes = new Uint8Array(await pdf.blob.arrayBuffer());
      const pdfAscii = new TextDecoder('latin1').decode(pdfBytes);
      return {
        dom: {
          revAli: document.querySelector('[data-key="rev_ali"]').value,
          revMegane: document.querySelector('[data-key="rev_megane"]').value,
          loyer: document.querySelector('[data-key="loyer"]').value,
          credit: document.querySelector('[data-key="credit"]').value
        },
        dashboard: document.getElementById('total-revenus').textContent,
        metrics,
        pdfTotals: pdfData.totals,
        sectionTotals: Object.fromEntries(pdfData.sections.map(section => [section.title, section.total])),
        pdfHasLogoImage: pdfAscii.includes('/Subtype /Image')
      };
    });

    expect(before.dom).toEqual({ revAli: '1800', revMegane: '1300', loyer: '700', credit: '200' });
    expect(before.dashboard.replace(/[^\d]/g, '')).toBe('3100');
    expect(before.metrics.income).toBe(3100);
    expect(before.metrics.fixed).toBe(900);
    expect(before.pdfTotals).toMatchObject({ income: 3100, fixed: 900, variable: 0, balance: 2200 });
    expect(before.sectionTotals).toEqual({ Revenus: 3100, 'Charges fixes': 900, 'Dépenses variables': 0 });
    expect(before.pdfHasLogoImage).toBe(true);

    const downloadPromise = page.waitForEvent('download');
    const excelResultPromise = page.evaluate(async () => {
      const { data, size } = await window.exportMonthlyExcel();
      return { data, size };
    });
    const [download, excelResult] = await Promise.all([downloadPromise, excelResultPromise]);
    expect(download.suggestedFilename()).toMatch(/^nexora-budget-.*\.xlsx$/);
    expect(excelResult.data.totals).toMatchObject(before.pdfTotals);
    expect(excelResult.size).toBeGreaterThan(5000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readFile(await download.path()));
    expect(workbook.worksheets.map(sheet => sheet.name).slice(0, 4)).toEqual([
      'Synthèse',
      'Revenus',
      'Charges fixes',
      'Dépenses variables'
    ]);
    expect(workbook.getWorksheet('Synthèse').getCell('A5').result).toBe(3100);
    expect(workbook.getWorksheet('Synthèse').getCell('C5').result).toBe(900);
    expect(workbook.getWorksheet('Synthèse').getCell('E5').result).toBe(2200);
    expect(workbook.getWorksheet('Synthèse').getImages()).toHaveLength(1);

    await page.evaluate(() => window.applySavedRevenues(true));
    await expect(page.locator('[data-key="rev_ali"]')).toHaveValue('2110');
    const after = await page.evaluate(() => {
      const month = document.getElementById('monthSelect').value;
      return {
        metrics: window.getMonthMetrics(month, { fromDom: true }),
        pdfTotals: window.NexoraPdfExport.collectBudgetData().totals
      };
    });
    expect(after.metrics.income).toBe(3410);
    expect(after.pdfTotals.income).toBe(3410);
  });
});
