const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const NAVY = [7, 12, 24];
const GOLD = [197, 154, 62];
const SOFT_GOLD = [248, 242, 226];
const LIGHT_BG = [248, 250, 252];
const BORDER = [226, 232, 240];
const TEXT = [30, 41, 59];
const MUTED = [100, 116, 139];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];
const PDF_LOGO_SIZE = 128;

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const normalizePdfSpaces = (value) => String(value ?? '')
  .replace(/\u202f/g, ' ')
  .replace(/\u00a0/g, ' ');

const sanitize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const amountFromValue = (value) => {
  const normalized = String(value || '').replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => normalizePdfSpaces(euroFormatter.format(amountFromValue(value)));

const color = ([r, g, b]) => `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;

const WIN_ANSI_EXTRA = {
  '€': 0x80,
  '‚': 0x82,
  'ƒ': 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  'ˆ': 0x88,
  '‰': 0x89,
  'Š': 0x8a,
  '‹': 0x8b,
  'Œ': 0x8c,
  'Ž': 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  'š': 0x9a,
  '›': 0x9b,
  'œ': 0x9c,
  'ž': 0x9e,
  'Ÿ': 0x9f
};

const normalizePdfText = (value) => String(value ?? '')
  .replace(/[\u2028\u2029]/g, ' ')
  .replace(/\u202f/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/→/g, ' au ')
  .replace(/->/g, ' au ')
  .replace(/\s+/g, ' ')
  .trim();

const getPdfMonthLabel = () => {
  const period = getPdfPeriod();
  return period.cycleLabel
    ? `${period.monthLabel} (Cycle du ${period.cycleLabel})`
    : period.monthLabel;
};

const getPdfPeriod = () => {
  const select = document.getElementById('monthSelect');
  const month = select?.value;
  if (month && typeof window.getBudgetCycleRange === 'function') {
    try {
      const range = window.getBudgetCycleRange(month);
      if (range?.monthLabel && range?.start && range?.end) {
        const start = new Date(range.start);
        const end = new Date(range.end);
        const startLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const endLabel = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        return {
          monthLabel: range.monthLabel,
          cycleLabel: `${startLabel} au ${endLabel}`
        };
      }
      if (range?.monthLabel && range?.rangeLabel) {
        return {
          monthLabel: range.monthLabel,
          cycleLabel: range.rangeLabel.replace(/\s*→\s*/g, ' au ')
        };
      }
    } catch (err) {
      console.warn('[PdfExport] failed to build month label from budget cycle range', err);
    }
  }
  return {
    monthLabel: sanitize(select?.selectedOptions?.[0]?.textContent || select?.value || 'Mois en cours'),
    cycleLabel: ''
  };
};

const winAnsiBytes = (value) => {
  const text = normalizePdfText(value);
  const bytes = [];
  for (const char of text) {
    if (Object.prototype.hasOwnProperty.call(WIN_ANSI_EXTRA, char)) {
      bytes.push(WIN_ANSI_EXTRA[char]);
      continue;
    }
    const code = char.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    bytes.push('?'.charCodeAt(0));
  }
  return bytes;
};

const textHex = (value) => {
  const bytes = winAnsiBytes(value);
  return `<${bytes.map(byte => byte.toString(16).padStart(2, '0')).join('')}>`;
};

const stripControls = (value) => sanitize(value).replace(/[✎×💬✓]/g, '').trim();

const getLabelText = (label) => {
  if (!label) return '';
  const textNode = Array.from(label.childNodes).find(node => node.nodeType === 3);
  return stripControls(textNode?.nodeValue || label.textContent || '');
};

const truncate = (value, maxLength = 58) => {
  const text = sanitize(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const toHex = (bytes) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const loadImageElement = (blob) => new Promise((resolve, reject) => {
  if (typeof Image === 'undefined' || typeof URL === 'undefined') {
    reject(new Error('Image decoding unavailable'));
    return;
  }

  const imageUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(imageUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    reject(new Error('Logo image decode failed'));
  };
  image.src = imageUrl;
});

const imageElementToPdfRgb = (image) => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = PDF_LOGO_SIZE;
  canvas.height = PDF_LOGO_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = `rgb(${NAVY[0]}, ${NAVY[1]}, ${NAVY[2]})`;
  ctx.fillRect(0, 0, PDF_LOGO_SIZE, PDF_LOGO_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, PDF_LOGO_SIZE, PDF_LOGO_SIZE);

  const rgba = ctx.getImageData(0, 0, PDF_LOGO_SIZE, PDF_LOGO_SIZE).data;
  const rgb = new Uint8Array(PDF_LOGO_SIZE * PDF_LOGO_SIZE * 3);
  for (let src = 0, dest = 0; src < rgba.length; src += 4) {
    rgb[dest++] = rgba[src];
    rgb[dest++] = rgba[src + 1];
    rgb[dest++] = rgba[src + 2];
  }

  return {
    width: PDF_LOGO_SIZE,
    height: PDF_LOGO_SIZE,
    colors: 3,
    bitsPerComponent: 8,
    filter: '/ASCIIHexDecode',
    hexData: toHex(rgb)
  };
};

const loadLogoForPdf = async () => {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch('/icon-192.png', { cache: 'force-cache' });
    if (!response.ok) return null;
    return imageElementToPdfRgb(await loadImageElement(await response.blob()));
  } catch {
    return null;
  }
};

const getMonthLabel = () => {
  const select = document.getElementById('monthSelect');
  return sanitize(select?.selectedOptions?.[0]?.textContent || select?.value || 'Mois en cours');
};

const collectSectionRows = (block, sectionName) => {
  if (!block) return [];
  const rows = [];
  block.querySelectorAll('.budget-row').forEach(row => {
    const input = row.querySelector('input.budget-input[data-key]:not(.paid-input):not(.note-input)');
    const label = row.querySelector('.budget-row-label');
    if (!input || !label) return;
    rows.push({
      section: sectionName,
      key: input.dataset.key,
      name: getLabelText(label),
      amount: amountFromValue(input.value)
    });
  });
  return rows;
};

const collectBudgetData = () => {
  if (typeof window.updateAll === 'function') window.updateAll();

  const blocks = Array.from(document.querySelectorAll('#section-saisie .budget-block'));
  const sections = [
    { title: 'Revenus', rows: collectSectionRows(blocks[0], 'income') },
    { title: 'Charges fixes', rows: collectSectionRows(blocks[1], 'fixed_expense') },
    { title: 'Dépenses variables', rows: collectSectionRows(blocks[2], 'variable_expense') }
  ].filter(section => section.rows.length > 0);

  const totals = {
    income: sections.find(section => section.title === 'Revenus')?.rows.reduce((sum, row) => sum + row.amount, 0) || 0,
    fixed: sections.find(section => section.title === 'Charges fixes')?.rows.reduce((sum, row) => sum + row.amount, 0) || 0,
    variable: sections.find(section => section.title === 'Dépenses variables')?.rows.reduce((sum, row) => sum + row.amount, 0) || 0
  };
  totals.balance = totals.income - totals.fixed - totals.variable;

  const period = getPdfPeriod();

  return {
    monthLabel: period.cycleLabel ? `${period.monthLabel} (Cycle du ${period.cycleLabel})` : period.monthLabel,
    reportMonthLabel: period.monthLabel,
    cycleLabel: period.cycleLabel,
    generatedAt: new Date(),
    sections,
    totals
  };
};

class PdfDocument {
  constructor() {
    this.pages = [];
    this.current = [];
    this.y = PAGE_HEIGHT - MARGIN;
    this.images = {};
    this.addPage();
  }

  addPage() {
    if (this.current.length) this.pages.push(this.current);
    this.current = [];
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensure(space) {
    if (this.y - space < MARGIN) this.addPage();
  }

  op(value) {
    this.current.push(value);
  }

  fill([r, g, b]) {
    this.op(`${color([r, g, b])} rg`);
  }

  stroke([r, g, b]) {
    this.op(`${color([r, g, b])} RG`);
  }

  rect(x, y, width, height, fillColor, strokeColor = null) {
    this.fill(fillColor);
    if (strokeColor) {
      this.stroke(strokeColor);
      this.op(`${x} ${y} ${width} ${height} re B`);
    } else {
      this.op(`${x} ${y} ${width} ${height} re f`);
    }
  }

  line(x1, y1, x2, y2, strokeColor = BORDER) {
    this.stroke(strokeColor);
    this.op(`0.8 w ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  text(value, x, y, { size = 11, bold = false, fillColor = TEXT } = {}) {
    this.fill(fillColor);
    this.op(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td ${textHex(value)} Tj ET`);
  }

  rightText(value, x, y, options = {}) {
    const estimatedWidth = sanitize(value).length * (options.size || 11) * 0.48;
    this.text(value, x - estimatedWidth, y, options);
  }

  centerText(value, x, y, options = {}) {
    const estimatedWidth = sanitize(value).length * (options.size || 11) * 0.48;
    this.text(value, x - (estimatedWidth / 2), y, options);
  }

  addImage(name, image) {
    if (image) this.images[name] = image;
  }

  image(name, x, y, width, height) {
    if (!this.images[name]) return;
    this.op(`q ${width} 0 0 ${height} ${x} ${y} cm /${name} Do Q`);
  }

  addFooters() {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      page.push(`${color(MUTED)} rg`);
      page.push(`BT /F1 8 Tf ${PAGE_WIDTH - MARGIN - 48} 24 Td ${textHex(`Page ${index + 1} / ${total}`)} Tj ET`);
      page.push(`${color(BORDER)} RG 0.6 w ${MARGIN} 38 m ${PAGE_WIDTH - MARGIN} 38 l S`);
    });
  }

  finish() {
    if (this.current.length) this.pages.push(this.current);
    this.addFooters();
    return buildPdf(this.pages, this.images);
  }
}

const addHeader = (pdf, data) => {
  const centerX = PAGE_WIDTH / 2;
  pdf.rect(0, PAGE_HEIGHT - 178, PAGE_WIDTH, 178, NAVY);
  pdf.rect(0, PAGE_HEIGHT - 180, PAGE_WIDTH, 4, GOLD);
  if (pdf.images.Logo) {
    pdf.image('Logo', centerX - 18, PAGE_HEIGHT - 58, 36, 36);
  } else {
    pdf.rect(centerX - 18, PAGE_HEIGHT - 58, 36, 36, GOLD);
    pdf.centerText('N', centerX, PAGE_HEIGHT - 45, { size: 17, bold: true, fillColor: NAVY });
  }
  pdf.centerText('NEXORA', centerX, PAGE_HEIGHT - 82, { size: 24, bold: true, fillColor: [255, 255, 255] });
  pdf.centerText('Rapport Premium Budget Mensuel', centerX, PAGE_HEIGHT - 105, { size: 12, fillColor: [226, 232, 240] });
  pdf.centerText(data.reportMonthLabel || data.monthLabel, centerX, PAGE_HEIGHT - 126, { size: 15, bold: true, fillColor: [255, 255, 255] });

  if (data.cycleLabel) {
    pdf.centerText('Cycle budgétaire', centerX, PAGE_HEIGHT - 148, { size: 9, bold: true, fillColor: GOLD });
    pdf.centerText(data.cycleLabel, centerX, PAGE_HEIGHT - 162, { size: 9, fillColor: [226, 232, 240] });
  }
  pdf.centerText(`Généré le ${data.generatedAt.toLocaleDateString('fr-FR')}`, centerX, PAGE_HEIGHT - 174, { size: 8, fillColor: [203, 213, 225] });
  pdf.y = PAGE_HEIGHT - 206;
};

const addSummary = (pdf, totals) => {
  const cards = [
    ['Revenus totaux', totals.income, GREEN],
    ['Charges fixes', totals.fixed, RED],
    ['Dépenses variables', totals.variable, RED],
    ['Solde', totals.balance, totals.balance >= 0 ? GREEN : RED]
  ];
  const gap = 10;
  const width = (PAGE_WIDTH - MARGIN * 2 - gap * 3) / 4;
  cards.forEach(([label, value, valueColor], index) => {
    const x = MARGIN + index * (width + gap);
    pdf.rect(x, pdf.y - 64, width, 64, LIGHT_BG, BORDER);
    pdf.text(label, x + 12, pdf.y - 24, { size: 8, bold: true, fillColor: MUTED });
    pdf.text(formatCurrency(value), x + 12, pdf.y - 48, { size: 13, bold: true, fillColor: valueColor });
  });
  pdf.y -= 92;
};

const addSection = (pdf, section) => {
  pdf.ensure(52);
  pdf.text(section.title, MARGIN, pdf.y, { size: 14, bold: true, fillColor: NAVY });
  pdf.y -= 18;
  pdf.rect(MARGIN, pdf.y - 22, PAGE_WIDTH - MARGIN * 2, 22, SOFT_GOLD);
  pdf.text('Nom', MARGIN + 12, pdf.y - 14, { size: 9, bold: true, fillColor: NAVY });
  pdf.rightText('Montant', PAGE_WIDTH - MARGIN - 12, pdf.y - 14, { size: 9, bold: true, fillColor: NAVY });
  pdf.y -= 28;

  section.rows.forEach((row, index) => {
    pdf.ensure(24);
    if (index % 2 === 1) pdf.rect(MARGIN, pdf.y - 16, PAGE_WIDTH - MARGIN * 2, 20, LIGHT_BG);
    pdf.text(truncate(row.name), MARGIN + 12, pdf.y - 10, { size: 9, fillColor: TEXT });
    pdf.rightText(formatCurrency(row.amount), PAGE_WIDTH - MARGIN - 12, pdf.y - 10, { size: 9, bold: row.amount !== 0, fillColor: row.amount === 0 ? MUTED : TEXT });
    pdf.line(MARGIN, pdf.y - 20, PAGE_WIDTH - MARGIN, pdf.y - 20, BORDER);
    pdf.y -= 22;
  });
  pdf.y -= 16;
};

const buildPdf = (pageStreams, images = {}) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const imageObjectIds = {};
  Object.entries(images).forEach(([name, image]) => {
    const stream = `${image.hexData}>`;
    const filter = image.filter || '/ASCIIHexDecode';
    const decodeParms = image.decodeParms ? ` /DecodeParms ${image.decodeParms}` : '';
    imageObjectIds[name] = addObject(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent ${image.bitsPerComponent} /Filter ${filter}${decodeParms} /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  const pageIds = [];
  const xObjectResource = Object.keys(imageObjectIds).length
    ? `/XObject << ${Object.entries(imageObjectIds).map(([name, id]) => `/${name} ${id} 0 R`).join(' ')} >>`
    : '';

  pageStreams.forEach(streamOps => {
    const stream = streamOps.join('\n');
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> ${xObjectResource} >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(chunks.join('').length);
    chunks.push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });
  const xrefOffset = chunks.join('').length;
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push('0000000000 65535 f \n');
  offsets.slice(1).forEach(offset => {
    chunks.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return chunks.join('');
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const filenameFor = (monthLabel) => {
  const slug = sanitize(monthLabel)
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'mois';
  return `nexora-budget-${slug}.pdf`;
};

const generateMonthlyBudgetPdf = () => {
  const data = collectBudgetData();
  const pdf = new PdfDocument();
  addHeader(pdf, data);
  addSummary(pdf, data.totals);
  data.sections.forEach(section => addSection(pdf, section));
  return {
    data,
    blob: new Blob([pdf.finish()], { type: 'application/pdf' })
  };
};

const generateMonthlyBudgetPdfPremium = async () => {
  const data = collectBudgetData();
  const pdf = new PdfDocument();
  pdf.addImage('Logo', await loadLogoForPdf());
  addHeader(pdf, data);
  addSummary(pdf, data.totals);
  data.sections.forEach(section => addSection(pdf, section));
  return {
    data,
    blob: new Blob([pdf.finish()], { type: 'application/pdf' })
  };
};

const exportMonthlyBudgetPdf = async () => {
  const { data, blob } = await generateMonthlyBudgetPdfPremium();
  downloadBlob(blob, filenameFor(data.monthLabel));
  return { data, size: blob.size };
};

export const NexoraPdfExport = {
  collectBudgetData,
  generateMonthlyBudgetPdf,
  generateMonthlyBudgetPdfPremium,
  exportMonthlyBudgetPdf
};

export { PdfDocument, addHeader, addSummary, addSection, loadLogoForPdf, collectBudgetData };
