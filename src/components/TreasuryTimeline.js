/**
 * Simple DOM renderer for treasury timeline (mobile-first minimal)
 */
import { escapeHtml } from '../utils/htmlEscape.js'

const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })} €`
}

const formatDate = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : null
  if (!date || Number.isNaN(date.getTime())) return 'Date estimée'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

const iconFor = (item) => {
  const title = String(item?.title || '').toLowerCase()
  if (Number(item?.amount) > 0) return '💰'
  if (/loyer|logement/.test(title)) return '🏠'
  if (/crédit|dette|carte/.test(title)) return '💳'
  if (/objectif|épargne/.test(title)) return '🎯'
  if (/alerte|risque/.test(title)) return '⚠️'
  return '📌'
}

const isImportant = (item) => {
  const amount = Math.abs(Number(item?.amount) || 0)
  if (amount <= 0) return false
  if (Number(item?.amount) > 0) return true
  if (amount >= 20) return true
  return ['critique', 'importante'].includes(String(item?.priority || '').toLowerCase())
}

export function renderTreasuryTimeline(containerId, timeline = []) {
  const container = (typeof document !== 'undefined') ? document.getElementById(containerId) : null
  if (!container) return
  container.innerHTML = ''
  const list = document.createElement('div')
  list.className = 'treasury-timeline'
  const visibleItems = timeline.filter(isImportant).slice(0, 12)
  visibleItems.forEach(item => {
    const row = document.createElement('div')
    row.className = 'treasury-row'
    const amount = (typeof item.amount === 'number' && Number.isFinite(item.amount)) ? item.amount : 0
    const balance = (typeof item.balance === 'number' && Number.isFinite(item.balance)) ? item.balance : 0
    const sign = amount > 0 ? '+' : ''
    row.innerHTML = `
      <div class="t-date">📅 ${formatDate(item.date)}</div>
      <div class="t-main">
        <strong>${iconFor(item)} ${escapeHtml(item.title || 'Événement')}</strong>
        <span>Solde après opération : ${formatCurrency(balance)}</span>
        ${item.dateEstimated ? '<em>date estimée</em>' : ''}
      </div>
      <div class="t-amount ${amount >= 0 ? 'positive' : 'negative'}">${sign}${formatCurrency(amount)}</div>
    `
    list.appendChild(row)
  })
  if (!visibleItems.length) {
    list.innerHTML = '<div class="plan-empty-line">Aucun mouvement important à afficher.</div>'
  }
  container.appendChild(list)
}

export default renderTreasuryTimeline
