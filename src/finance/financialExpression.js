export function parseFinancialExpression(value, options = {}) {
  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : null
  if (value === null || value === undefined) return fallback

  const raw = String(value)
    .trim()
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')

  if (!raw) return fallback
  if (!/^[0-9+\-.,\s]+$/.test(raw)) return fallback

  const compact = raw.replace(/\s+/g, '').replace(/,/g, '.')
  if (!/^[+-]?\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)*$/.test(compact)) return fallback

  const tokens = compact.match(/[+-]?\d+(?:\.\d+)?/g)
  if (!tokens || tokens.join('') !== compact) return fallback

  const result = tokens.reduce((sum, token) => sum + Number(token), 0)
  return Number.isFinite(result) ? result : fallback
}

export default parseFinancialExpression
