export function parseFinancialExpression(value, options = {}) {
  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : null
  if (value === null || value === undefined) return fallback

  const raw = String(value)
    .trim()
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')

  if (!raw) return fallback

  // Uniquement additions/soustractions de nombres — jamais *, /, lettres ou tronquage.
  if (!/^[0-9+\-.,\s]+$/.test(raw)) return null
  if (/[*×÷/\\]/.test(raw)) return null

  const compact = raw.replace(/\s+/g, '').replace(/,/g, '.')
  if (!compact) return fallback
  if (!/^[+-]?(?:\d+(?:\.\d+)?)(?:[+-]\d+(?:\.\d+)?)*$/.test(compact)) return null

  const tokens = compact.match(/[+-]?\d+(?:\.\d+)?/g)
  if (!tokens || tokens.join('') !== compact) return null

  const result = tokens.reduce((sum, token) => sum + Number(token), 0)
  return Number.isFinite(result) ? result : null
}

export function parseFinancialExpressionStrict(value) {
  const parsed = parseFinancialExpression(value, { fallback: null })
  if (parsed === null) {
    return { ok: false, value: null, error: 'Expression financière invalide' }
  }
  return { ok: true, value: parsed, error: null }
}

export default parseFinancialExpression
