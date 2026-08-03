import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildMonthlyBudgetWorkbook } from './excel-export.js';

const data = {
  monthLabel: 'Août 2026',
  generatedAt: new Date('2026-08-03T10:00:00.000Z'),
  sections: [
    {
      title: 'Revenus',
      total: 3100,
      rows: [
        { key: 'rev_ali', name: 'Revenu principal — Utilisateur', amount: 1800 },
        { key: 'rev_megane', name: 'Revenu principal — Mon foyer', amount: 1300 }
      ]
    },
    {
      title: 'Charges fixes',
      total: 900,
      rows: [
        { key: 'loyer', name: 'Loyer', amount: 700 },
        { key: 'credit', name: 'Crédit', amount: 200 }
      ]
    },
    {
      title: 'Dépenses variables',
      total: 0,
      rows: [{ key: 'courses', name: 'Courses', amount: 0 }]
    }
  ],
  totals: {
    income: 3100,
    fixed: 900,
    variable: 0,
    balance: 2200,
    savingsRate: 2200 / 3100 * 100
  },
  debts: [{ name: 'Crédit auto', amount: 4000, monthly: 250 }],
  goals: [{ name: 'Vacances', current: 500, target: 2000, amount: 1500 }]
};

const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xb6F9QAAAABJRU5ErkJggg==';
const { workbook, references } = buildMonthlyBudgetWorkbook(data, { logoDataUrl: tinyPng });

assert.deepEqual(
  workbook.worksheets.map(sheet => sheet.name),
  ['Synthèse', 'Revenus', 'Charges fixes', 'Dépenses variables', 'Dettes', 'Objectifs']
);
assert.equal(workbook.getWorksheet('Synthèse').getCell('A5').value.result, 3100);
assert.equal(workbook.getWorksheet('Synthèse').getCell('C5').value.result, 900);
assert.equal(workbook.getWorksheet('Synthèse').getCell('E5').value.result, 2200);
assert.equal(workbook.getWorksheet('Synthèse').getCell('G5').value.result, 2200 / 3100);
assert.equal(workbook.getWorksheet('Revenus').getCell(references.revenues.totalCell).value.result, 3100);
assert.equal(workbook.getWorksheet('Charges fixes').getCell(references.fixed.totalCell).value.result, 900);
assert.equal(workbook.getWorksheet('Synthèse').getImages().length, 1);
assert.equal(workbook.getWorksheet('Revenus').getImages().length, 1);

const buffer = await workbook.xlsx.writeBuffer();
assert.ok(buffer.byteLength > 5000, 'the generated workbook should contain a real XLSX archive');

const reloaded = new ExcelJS.Workbook();
await reloaded.xlsx.load(buffer);
assert.equal(reloaded.getWorksheet('Synthèse').getCell('A5').result, 3100);
assert.equal(reloaded.getWorksheet('Revenus').getCell(references.revenues.totalCell).result, 3100);
assert.equal(reloaded.getWorksheet('Charges fixes').getCell(references.fixed.totalCell).result, 900);
assert.equal(reloaded.getWorksheet('Objectifs').getCell('D6').value, 1500);

const { workbook: workbookWithoutOptionalSheets } = buildMonthlyBudgetWorkbook({
  ...data,
  debts: [],
  goals: []
});
assert.deepEqual(
  workbookWithoutOptionalSheets.worksheets.map(sheet => sheet.name),
  ['Synthèse', 'Revenus', 'Charges fixes', 'Dépenses variables']
);

console.log('excelExport-tests: OK');
