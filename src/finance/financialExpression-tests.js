#!/usr/bin/env node
import assert from 'node:assert/strict'
import { parseFinancialExpression } from './financialExpression.js'

const validCases = [
  ['450', 450],
  ['450+50', 500],
  ['1200-300', 900],
  ['1700+308', 2008],
  ['500-120+50', 430],
  ['1 200,50 + 49.50', 1250],
  ['1.700,50', 1700.5],
  ['1 200,50 + 49.50', 1250],
  ['1700,', 1700],
  ['1700.', 1700]
]

for (const [expression, expected] of validCases) {
  assert.equal(parseFinancialExpression(expression), expected, `${expression} should be ${expected}`)
}

const invalidCases = ['abc', 'bonjour', '450+abc', '12*/5', '12*5', '100/2', '450+', '+', '--12']

for (const expression of invalidCases) {
  assert.equal(parseFinancialExpression(expression), null, `${expression} should be rejected`)
}

assert.equal(parseFinancialExpression('450+abc', { fallback: 0 }), null, 'fallback must not coerce invalid expression')

console.log('financialExpression-tests: OK')
