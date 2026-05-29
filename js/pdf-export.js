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

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
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
  .replace(/\u00a0/g, ' ');

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

const readUInt32 = (bytes, offset) => (
  ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
);

const asciiFromBytes = (bytes, start, length) => (
  String.fromCharCode(...bytes.slice(start, start + length))
);

const toHex = (bytes) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const parsePngForPdf = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, index) => bytes[index] === byte)) return null;

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 2;
  const idatParts = [];

  while (offset < bytes.length) {
    const length = readUInt32(bytes, offset);
    const type = asciiFromBytes(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = readUInt32(bytes, dataStart);
      height = readUInt32(bytes, dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
    } else if (type === 'IDAT') {
      idatParts.push(bytes.slice(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  const colors = colorType === 0 ? 1 : colorType === 2 ? 3 : null;
  if (!width || !height || bitDepth !== 8 || !colors || idatParts.length === 0) return null;

  const idatLength = idatParts.reduce((sum, part) => sum + part.length, 0);
  const idat = new Uint8Array(idatLength);
  let cursor = 0;
  idatParts.forEach(part => {
    idat.set(part, cursor);
    cursor += part.length;
  });

  return {
    width,
    height,
    colors,
    bitsPerComponent: bitDepth,
    hexData: toHex(idat)
  };
};

const loadLogoForPdf = async () => {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch('/icon-192.png', { cache: 'force-cache' });
    if (!response.ok) return null;
    return parsePngForPdf(await response.arrayBuffer());
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

  return {
    monthLabel: getMonthLabel(),
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
  pdf.rect(0, PAGE_HEIGHT - 138, PAGE_WIDTH, 138, NAVY);
  pdf.rect(0, PAGE_HEIGHT - 140, PAGE_WIDTH, 4, GOLD);
  if (pdf.images.Logo) {
    pdf.image('Logo', MARGIN, PAGE_HEIGHT - 94, 46, 46);
  } else {
    pdf.rect(MARGIN, PAGE_HEIGHT - 94, 46, 46, GOLD);
    pdf.text('N', MARGIN + 14, PAGE_HEIGHT - 76, { size: 21, bold: true, fillColor: NAVY });
  }
  pdf.text('NEXORA', MARGIN + 60, PAGE_HEIGHT - 60, { size: 24, bold: true, fillColor: [255, 255, 255] });
  pdf.text('Rapport premium du budget mensuel', MARGIN + 60, PAGE_HEIGHT - 82, { size: 10, fillColor: [203, 213, 225] });
  pdf.rightText(data.monthLabel, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 58, { size: 14, bold: true, fillColor: [255, 255, 255] });
  pdf.rightText(`Généré le ${data.generatedAt.toLocaleDateString('fr-FR')}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 80, { size: 9, fillColor: [203, 213, 225] });
  pdf.y = PAGE_HEIGHT - 166;
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
    imageObjectIds[name] = addObject(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent ${image.bitsPerComponent} /Filter [/ASCIIHexDecode /FlateDecode] /DecodeParms << /Predictor 15 /Colors ${image.colors} /BitsPerComponent ${image.bitsPerComponent} /Columns ${image.width} >> /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
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
