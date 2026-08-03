import ExcelJS from 'exceljs';
import { collectBudgetData } from './pdf-export.js';
import { OFFICIAL_LOGO } from './logo-manager.js';
import { buildBudgetExportFilename, downloadBlob } from './export-utils.js';

const COLORS = {
  navy: 'FF070C18',
  surface: 'FF0D1320',
  elevated: 'FF141C2C',
  gold: 'FFD7A94A',
  softGold: 'FFF8F2E2',
  white: 'FFF5F7FA',
  text: 'FF1E293B',
  muted: 'FF64748B',
  border: 'FFE2E8F0',
  green: 'FF2ECC71',
  turquoise: 'FF3DD6C6',
  orange: 'FFF97316',
  red: 'FFFF6B6B',
  light: 'FFF8FAFC'
};

const CURRENCY_FORMAT = '#,##0.00 "€"';
const PERCENT_FORMAT = '0.0%';
const BORDER_STYLE = {
  bottom: { style: 'thin', color: { argb: COLORS.border } }
};

const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const styleSheet = (sheet, widths) => {
  sheet.views = [{ state: 'frozen', ySplit: 5, showGridLines: false, zoomScale: 95 }];
  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  };
  sheet.headerFooter.oddFooter = '&LNexora — Budget mensuel&C&F&RPage &P / &N';
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
};

const addLogo = (sheet, logoId) => {
  if (logoId === null) return;
  sheet.addImage(logoId, {
    tl: { col: 0.15, row: 0.15 },
    ext: { width: 46, height: 46 },
    editAs: 'oneCell'
  });
};

const addBrandHeader = (sheet, title, subtitle, logoId, lastColumn = 'E') => {
  sheet.mergeCells(`B1:${lastColumn}2`);
  const titleCell = sheet.getCell('B1');
  titleCell.value = title;
  titleCell.font = { name: 'Aptos Display', size: 20, bold: true, color: { argb: COLORS.white } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = solidFill(COLORS.navy);

  sheet.mergeCells(`A3:${lastColumn}3`);
  const subtitleCell = sheet.getCell('A3');
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Aptos', size: 10, color: { argb: COLORS.muted } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.getCell('A1').fill = solidFill(COLORS.navy);
  sheet.getCell('A2').fill = solidFill(COLORS.navy);
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 28;
  sheet.getRow(3).height = 22;

  addLogo(sheet, logoId);
};

const styleTableHeader = (row, accent = COLORS.gold) => {
  row.height = 24;
  row.eachCell(cell => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = solidFill(accent);
    cell.alignment = { vertical: 'middle' };
  });
};

const styleBodyRows = (sheet, fromRow, toRow, currencyColumns = []) => {
  for (let rowNumber = fromRow; rowNumber <= toRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 21;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Aptos', size: 10, color: { argb: COLORS.text } };
      cell.fill = solidFill(rowNumber % 2 === 0 ? COLORS.light : COLORS.white);
      cell.border = BORDER_STYLE;
      cell.alignment = { vertical: 'middle' };
    });
    currencyColumns.forEach(columnNumber => {
      row.getCell(columnNumber).numFmt = CURRENCY_FORMAT;
      row.getCell(columnNumber).alignment = { vertical: 'middle', horizontal: 'right' };
    });
  }
};

const styleTotalRow = (row, currencyColumns = []) => {
  row.height = 24;
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.navy } };
    cell.fill = solidFill(COLORS.softGold);
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.gold } },
      bottom: { style: 'thin', color: { argb: COLORS.gold } }
    };
  });
  currencyColumns.forEach(columnNumber => {
    row.getCell(columnNumber).numFmt = CURRENCY_FORMAT;
    row.getCell(columnNumber).alignment = { horizontal: 'right' };
  });
};

const findSection = (data, title) => data.sections?.find(section => section.title === title) || { rows: [], total: 0 };

const addBudgetLinesSheet = ({ workbook, sheetName, title, section, accent, logoId, monthLabel }) => {
  const sheet = workbook.addWorksheet(sheetName, { properties: { tabColor: { argb: accent } } });
  styleSheet(sheet, [42, 18, 18]);
  addBrandHeader(sheet, title, monthLabel, logoId, 'C');

  const headerRow = sheet.getRow(5);
  headerRow.values = ['Catégorie', 'Montant', 'Part du total'];
  styleTableHeader(headerRow, accent);

  const firstDataRow = 6;
  const rows = Array.isArray(section.rows) ? section.rows : [];
  rows.forEach((line, index) => {
    const rowNumber = firstDataRow + index;
    const row = sheet.getRow(rowNumber);
    row.values = [line.name, Number(line.amount) || 0, null];
  });
  const lastDataRow = Math.max(firstDataRow, firstDataRow + rows.length - 1);
  const totalRowNumber = firstDataRow + rows.length;
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.getCell(1).value = `Total ${title.toLowerCase()}`;
  totalRow.getCell(2).value = {
    formula: rows.length ? `SUM(B${firstDataRow}:B${lastDataRow})` : '0',
    result: Number(section.total) || 0
  };
  totalRow.getCell(3).value = Number(section.total) > 0 ? 1 : 0;

  if (rows.length) {
    styleBodyRows(sheet, firstDataRow, lastDataRow, [2]);
    for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber += 1) {
      const amount = Number(rows[rowNumber - firstDataRow]?.amount) || 0;
      sheet.getCell(`C${rowNumber}`).value = {
        formula: `IF($B$${totalRowNumber}=0,0,B${rowNumber}/$B$${totalRowNumber})`,
        result: Number(section.total) > 0 ? amount / Number(section.total) : 0
      };
      sheet.getCell(`C${rowNumber}`).numFmt = PERCENT_FORMAT;
      sheet.getCell(`C${rowNumber}`).alignment = { horizontal: 'right' };
    }
    sheet.autoFilter = { from: `A5`, to: `C${lastDataRow}` };
  }

  totalRow.getCell(3).numFmt = PERCENT_FORMAT;
  styleTotalRow(totalRow, [2]);
  sheet.printArea = `A1:C${totalRowNumber}`;
  return {
    sheet,
    totalRow: totalRowNumber,
    totalCell: `B${totalRowNumber}`,
    totalRef: `$B$${totalRowNumber}`
  };
};

const addDebtsSheet = ({ workbook, debts, logoId, monthLabel }) => {
  const sheet = workbook.addWorksheet('Dettes', { properties: { tabColor: { argb: COLORS.red } } });
  styleSheet(sheet, [38, 20, 20]);
  addBrandHeader(sheet, 'Dettes', monthLabel, logoId, 'C');
  const headerRow = sheet.getRow(5);
  headerRow.values = ['Dette', 'Capital restant', 'Mensualité'];
  styleTableHeader(headerRow, COLORS.red);

  debts.forEach((debt, index) => {
    sheet.getRow(6 + index).values = [debt.name, Number(debt.amount) || 0, Number(debt.monthly) || 0];
  });
  const firstDataRow = 6;
  const lastDataRow = firstDataRow + debts.length - 1;
  styleBodyRows(sheet, firstDataRow, lastDataRow, [2, 3]);
  sheet.autoFilter = { from: 'A5', to: `C${lastDataRow}` };

  const totalRowNumber = lastDataRow + 1;
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.getCell(1).value = 'Total dettes';
  totalRow.getCell(2).value = { formula: `SUM(B${firstDataRow}:B${lastDataRow})`, result: debts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0) };
  totalRow.getCell(3).value = { formula: `SUM(C${firstDataRow}:C${lastDataRow})`, result: debts.reduce((sum, debt) => sum + (Number(debt.monthly) || 0), 0) };
  styleTotalRow(totalRow, [2, 3]);
  sheet.printArea = `A1:C${totalRowNumber}`;
};

const addGoalsSheet = ({ workbook, goals, logoId, monthLabel }) => {
  const sheet = workbook.addWorksheet('Objectifs', { properties: { tabColor: { argb: COLORS.turquoise } } });
  styleSheet(sheet, [34, 18, 18, 18, 16]);
  addBrandHeader(sheet, 'Objectifs', monthLabel, logoId, 'E');
  const headerRow = sheet.getRow(5);
  headerRow.values = ['Objectif', 'Déjà épargné', 'Cible', 'Restant', 'Progression'];
  styleTableHeader(headerRow, COLORS.turquoise);

  goals.forEach((goal, index) => {
    const rowNumber = 6 + index;
    const current = Number(goal.current) || 0;
    const target = Number(goal.target) || 0;
    const remaining = Number(goal.amount) || 0;
    const row = sheet.getRow(rowNumber);
    row.values = [goal.name, current, target, remaining, null];
    row.getCell(5).value = {
      formula: `IF(C${rowNumber}=0,0,B${rowNumber}/C${rowNumber})`,
      result: target > 0 ? current / target : 0
    };
    row.getCell(5).numFmt = PERCENT_FORMAT;
  });
  const firstDataRow = 6;
  const lastDataRow = firstDataRow + goals.length - 1;
  styleBodyRows(sheet, firstDataRow, lastDataRow, [2, 3, 4]);
  sheet.autoFilter = { from: 'A5', to: `E${lastDataRow}` };

  const totalRowNumber = lastDataRow + 1;
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.getCell(1).value = 'Total objectifs';
  [2, 3, 4].forEach(column => {
    const result = goals.reduce((sum, goal) => {
      const field = column === 2 ? 'current' : column === 3 ? 'target' : 'amount';
      return sum + (Number(goal[field]) || 0);
    }, 0);
    totalRow.getCell(column).value = { formula: `SUM(${String.fromCharCode(64 + column)}${firstDataRow}:${String.fromCharCode(64 + column)}${lastDataRow})`, result };
  });
  totalRow.getCell(5).value = {
    formula: `IF(C${totalRowNumber}=0,0,B${totalRowNumber}/C${totalRowNumber})`,
    result: goals.reduce((sum, goal) => sum + (Number(goal.target) || 0), 0) > 0
      ? goals.reduce((sum, goal) => sum + (Number(goal.current) || 0), 0) / goals.reduce((sum, goal) => sum + (Number(goal.target) || 0), 0)
      : 0
  };
  totalRow.getCell(5).numFmt = PERCENT_FORMAT;
  styleTotalRow(totalRow, [2, 3, 4]);
  sheet.printArea = `A1:E${totalRowNumber}`;
};

const styleKpiCard = (sheet, labelRange, valueRange, label, value, fill, numberFormat) => {
  sheet.mergeCells(labelRange);
  sheet.mergeCells(valueRange);
  const labelCell = sheet.getCell(labelRange.split(':')[0]);
  labelCell.value = label;
  labelCell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: COLORS.white } };
  labelCell.fill = solidFill(fill);
  labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
  const valueCell = sheet.getCell(valueRange.split(':')[0]);
  valueCell.value = value;
  valueCell.font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: COLORS.navy } };
  valueCell.fill = solidFill(COLORS.light);
  valueCell.alignment = { vertical: 'middle', horizontal: 'center' };
  valueCell.numFmt = numberFormat;
};

const populateSummarySheet = ({ sheet, data, references, logoId }) => {
  styleSheet(sheet, [10, 18, 18, 18, 18, 18, 18, 18]);
  addBrandHeader(sheet, 'Synthèse mensuelle', data.monthLabel, logoId, 'H');
  sheet.views = [{ showGridLines: false, zoomScale: 90 }];
  [4, 5, 6].forEach(rowNumber => { sheet.getRow(rowNumber).height = rowNumber === 4 ? 22 : 25; });

  const expenses = Number(data.totals.fixed || 0) + Number(data.totals.variable || 0);
  const savingsRate = Number(data.totals.savingsRate || 0) / 100;
  styleKpiCard(sheet, 'A4:B4', 'A5:B6', 'Revenus', {
    formula: `'Revenus'!${references.revenues.totalRef}`,
    result: Number(data.totals.income) || 0
  }, COLORS.green, CURRENCY_FORMAT);
  styleKpiCard(sheet, 'C4:D4', 'C5:D6', 'Dépenses', {
    formula: `'Charges fixes'!${references.fixed.totalRef}+'Dépenses variables'!${references.variable.totalRef}`,
    result: expenses
  }, COLORS.red, CURRENCY_FORMAT);
  styleKpiCard(sheet, 'E4:F4', 'E5:F6', 'Reste', {
    formula: 'A5-C5',
    result: Number(data.totals.balance) || 0
  }, Number(data.totals.balance) >= 0 ? COLORS.turquoise : COLORS.red, CURRENCY_FORMAT);
  styleKpiCard(sheet, 'G4:H4', 'G5:H6', "Taux d'épargne", {
    formula: 'IF(A5=0,0,E5/A5)',
    result: savingsRate
  }, COLORS.gold, PERCENT_FORMAT);

  sheet.mergeCells('A8:H8');
  const distributionTitle = sheet.getCell('A8');
  distributionTitle.value = 'Répartition des dépenses';
  distributionTitle.font = { name: 'Aptos Display', size: 12, bold: true, color: { argb: COLORS.white } };
  distributionTitle.fill = solidFill(COLORS.navy);
  distributionTitle.alignment = { vertical: 'middle' };
  sheet.getRow(8).height = 24;

  const distributionRows = [
    ['Charges fixes', { formula: `'Charges fixes'!${references.fixed.totalRef}`, result: Number(data.totals.fixed) || 0 }, COLORS.red],
    ['Dépenses variables', { formula: `'Dépenses variables'!${references.variable.totalRef}`, result: Number(data.totals.variable) || 0 }, COLORS.orange]
  ];
  distributionRows.forEach(([label, value, color], index) => {
    const rowNumber = 9 + index;
    sheet.mergeCells(`A${rowNumber}:C${rowNumber}`);
    sheet.getCell(`A${rowNumber}`).value = label;
    sheet.getCell(`A${rowNumber}`).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.text } };
    sheet.getCell(`D${rowNumber}`).value = value;
    sheet.getCell(`D${rowNumber}`).numFmt = CURRENCY_FORMAT;
    sheet.getCell(`D${rowNumber}`).font = { name: 'Aptos', size: 10, bold: true, color: { argb: color } };
    sheet.mergeCells(`E${rowNumber}:H${rowNumber}`);
    const ratioCell = sheet.getCell(`E${rowNumber}`);
    ratioCell.value = {
      formula: `IF($C$5=0,0,D${rowNumber}/$C$5)`,
      result: expenses > 0 ? Number(value.result) / expenses : 0
    };
    ratioCell.numFmt = PERCENT_FORMAT;
    ratioCell.alignment = { horizontal: 'right' };
    sheet.getRow(rowNumber).height = 22;
  });
  sheet.addConditionalFormatting({
    ref: 'E9:E10',
    rules: [{
      type: 'colorScale',
      cfvo: [{ type: 'min' }, { type: 'max' }],
      color: [{ argb: COLORS.softGold }, { argb: COLORS.gold }]
    }]
  });

  sheet.mergeCells('A12:H12');
  const note = sheet.getCell('A12');
  note.value = `Rapport généré le ${new Date(data.generatedAt || Date.now()).toLocaleString('fr-FR')}`;
  note.font = { name: 'Aptos', size: 9, italic: true, color: { argb: COLORS.muted } };
  note.alignment = { horizontal: 'right' };
  sheet.printArea = 'A1:H12';
};

export const buildMonthlyBudgetWorkbook = (data, { logoDataUrl = null } = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nexora';
  workbook.company = 'Nexora';
  workbook.subject = `Budget mensuel — ${data.monthLabel}`;
  workbook.title = `Nexora — ${data.monthLabel}`;
  workbook.created = new Date(data.generatedAt || Date.now());
  workbook.modified = new Date(data.generatedAt || Date.now());
  workbook.calcProperties.fullCalcOnLoad = true;

  const summaryLogoId = logoDataUrl
    ? workbook.addImage({ base64: logoDataUrl, extension: 'png' })
    : null;
  const logoId = logoDataUrl
    ? workbook.addImage({ base64: logoDataUrl, extension: 'png' })
    : null;
  const summarySheet = workbook.addWorksheet('Synthèse', { properties: { tabColor: { argb: COLORS.gold } } });
  addLogo(summarySheet, summaryLogoId);
  const references = {
    revenues: addBudgetLinesSheet({
      workbook,
      sheetName: 'Revenus',
      title: 'Revenus',
      section: findSection(data, 'Revenus'),
      accent: COLORS.green,
      logoId,
      monthLabel: data.monthLabel
    }),
    fixed: addBudgetLinesSheet({
      workbook,
      sheetName: 'Charges fixes',
      title: 'Charges fixes',
      section: findSection(data, 'Charges fixes'),
      accent: COLORS.red,
      logoId,
      monthLabel: data.monthLabel
    }),
    variable: addBudgetLinesSheet({
      workbook,
      sheetName: 'Dépenses variables',
      title: 'Dépenses variables',
      section: findSection(data, 'Dépenses variables'),
      accent: COLORS.orange,
      logoId,
      monthLabel: data.monthLabel
    })
  };

  if (Array.isArray(data.debts) && data.debts.length) {
    addDebtsSheet({ workbook, debts: data.debts, logoId, monthLabel: data.monthLabel });
  }
  if (Array.isArray(data.goals) && data.goals.length) {
    addGoalsSheet({ workbook, goals: data.goals, logoId, monthLabel: data.monthLabel });
  }
  populateSummarySheet({ sheet: summarySheet, data, references, logoId: null });

  return { workbook, data, references };
};

const loadLogoDataUrl = async () => {
  if (typeof fetch !== 'function' || typeof btoa !== 'function') return null;
  try {
    const response = await fetch(OFFICIAL_LOGO, { cache: 'force-cache' });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    return `data:${response.headers.get('content-type') || 'image/png'};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
};

export const generateMonthlyBudgetXlsx = async () => {
  const data = collectBudgetData();
  const { workbook } = buildMonthlyBudgetWorkbook(data, { logoDataUrl: await loadLogoDataUrl() });
  const buffer = await workbook.xlsx.writeBuffer();
  return { data, buffer };
};

export const exportMonthlyBudgetXlsx = async () => {
  const { data, buffer } = await generateMonthlyBudgetXlsx();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  downloadBlob(blob, buildBudgetExportFilename(data.monthLabel, 'xlsx'));
  return { data, size: blob.size, buffer };
};

export const NexoraExcelExport = {
  buildMonthlyBudgetWorkbook,
  generateMonthlyBudgetXlsx,
  exportMonthlyBudgetXlsx
};

export default NexoraExcelExport;
