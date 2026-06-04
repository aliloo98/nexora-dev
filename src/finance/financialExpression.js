function normalizeFinancialExpressionToken(token) {
  if (token === null || token === undefined) return null
  const raw = String(token).trim()
  if (!raw) return null

  const signMatch = raw.match(/^([+-])\s*(.*)$/)
  let sign = ''
  let body = raw
  if (signMatch) {
    sign = signMatch[1]
    body = signMatch[2]
  }

  const cleaned = body.replace(/\s+/g, '')
  if (!/^[0-9.,]+$/.test(cleaned)) return null

  const hasDot = cleaned.includes('.')
  const hasComma = cleaned.includes(',')
  let normalized = cleaned

  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf('.')
    const lastComma = cleaned.lastIndexOf(',')
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = cleaned.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = cleaned.replace(/,/g, '.')
    const dotCount = (normalized.match(/\./g) || []).length
    if (dotCount > 1) {
      const segments = normalized.split('.')
      const lastSegment = segments[segments.length - 1]
      if (lastSegment.length === 2) {
        normalized = segments.slice(0, -1).join('') + '.' + lastSegment
      } else {
        normalized = segments.join('')
      }
    }
  } else if (hasDot) {
    const segments = normalized.split('.')
    if (segments.length > 2) {
      const lastSegment = segments[segments.length - 1]
      if (lastSegment.length === 2) {
        normalized = segments.slice(0, -1).join('') + '.' + lastSegment
      } else {
        normalized = segments.join('')
      }
    }
  }

  if (normalized.endsWith('.') || normalized.endsWith(',')) normalized = normalized.slice(0, -1)
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null
  return sign + normalized
}

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

  const tokenMatches = raw.match(/[+-]?\s*[0-9][0-9\s.,]*/g)
  if (!tokenMatches) return null
  if (tokenMatches.join('').replace(/\s+/g, '') !== raw.replace(/\s+/g, '')) return null

  const normalizedTokens = tokenMatches.map(normalizeFinancialExpressionToken)
  if (normalizedTokens.some((token) => token === null)) return null

  const compact = normalizedTokens.join('')
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
