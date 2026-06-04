import assert from 'assert';
import fs from 'fs';
import path from 'path';

const htmlPath = new URL('../../index.html', import.meta.url);
const html = fs.readFileSync(htmlPath, 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`Function ${name} not found`);
  let index = source.indexOf('{', start);
  if (index === -1) throw new Error(`Function ${name} opening brace not found`);
  let depth = 1;
  index += 1;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    index += 1;
  }
  if (depth !== 0) throw new Error(`Function ${name} closing brace not found`);
  return source.slice(start, index);
}

const normalizeBudgetNumberTokenSource = extractFunction(html, 'normalizeBudgetNumberToken');
const parseBudgetNumberSource = extractFunction(html, 'parseBudgetNumber');
const parseBudgetNumberStrictSource = extractFunction(html, 'parseBudgetNumberStrict');

const window = { parseFinancialExpression: undefined };
const normalizeBudgetNumberToken = eval(`(${normalizeBudgetNumberTokenSource})`);
const parseBudgetNumber = eval(`(${parseBudgetNumberSource})`);
const parseBudgetNumberStrict = eval(`(${parseBudgetNumberStrictSource})`);

assert.strictEqual(parseBudgetNumber('1700,50'), 1700.5, '1700,50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumber('1700.50'), 1700.5, '1700.50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumber('1 700,50'), 1700.5, '1 700,50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumber('1700'), 1700, '1700 should parse as 1700');
assert.strictEqual(parseBudgetNumber('1.700,50'), 1700.5, '1.700,50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumber('1,700.50'), 1700.5, '1,700.50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumber('1.700.50'), 1700.5, '1.700.50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumber('1700,'), 1700, '1700, should parse as 1700');
assert.strictEqual(parseBudgetNumber('1700.'), 1700, '1700. should parse as 1700');

assert.strictEqual(parseBudgetNumberStrict('1700,50'), 1700.5, 'strict 1700,50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumberStrict('1700.50'), 1700.5, 'strict 1700.50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumberStrict('1 700,50'), 1700.5, 'strict 1 700,50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumberStrict('1700'), 1700, 'strict 1700 should parse as 1700');
assert.strictEqual(parseBudgetNumberStrict('1.700,50'), 1700.5, 'strict 1.700,50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumberStrict('1,700.50'), 1700.5, 'strict 1,700.50 should parse as 1700.5');
assert.strictEqual(parseBudgetNumberStrict(''), null, 'strict empty string should return null');
assert.strictEqual(parseBudgetNumber(''), 0, 'empty string should return 0');

console.log('parseBudgetNumber-tests: OK');
