import { parseFinancialExpression } from '../finance/financialExpression.js'
import { escapeHtml } from '../utils/htmlEscape.js'

export const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })} €`
}

export const formatShortDate = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : null
  if (!date || Number.isNaN(date.getTime())) return 'date estimée'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export const escapeAttr = escapeHtml

export const parseAmount = (value) => {
  const parsed = parseFinancialExpression(value, { fallback: null })
  return parsed === null ? null : parsed
}

export const buildEmptyState = () => `
  <div class="empty-state plan-empty-state">
    <p>Le plan du mois n'est pas encore construit</p>
    <p>Ajoute les revenus et les charges pour obtenir un plan de trésorerie clair et prioritaire.</p>
    <button class="btn btn-gold" type="button" onclick="showSection('saisie')">Démarrer le plan</button>
  </div>
`
