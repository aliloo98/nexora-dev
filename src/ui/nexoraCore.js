/**
 * Nexora Core V2 — centre de contrôle financier (globe + métriques).
 */

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const formatEuro = (value) => {
  const amount = Number(value) || 0
  return `${Math.round(amount).toLocaleString('fr-FR')} €`
}

const riskLabel = (risk) => {
  if (risk >= 55) return 'Élevé'
  if (risk >= 32) return 'Modéré'
  return 'Faible'
}

const healthLabel = (health) => {
  if (health >= 72) return 'Solide'
  if (health >= 45) return 'À surveiller'
  return 'Fragile'
}

let tiltBound = false

const bindGlobeTilt = (root) => {
  if (tiltBound || prefersReducedMotion()) return
  const globe = root?.querySelector?.('.nexora-core-globe')
  if (!globe) return
  tiltBound = true

  const onMove = (event) => {
    const rect = globe.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clamp((event.clientX - cx) / (rect.width / 2), -1, 1)
    const dy = clamp((event.clientY - cy) / (rect.height / 2), -1, 1)
    globe.style.setProperty('--core-tilt-x', `${dy * -7}deg`)
    globe.style.setProperty('--core-tilt-y', `${dx * 9}deg`)
  }

  root.addEventListener('pointermove', onMove, { passive: true })
  root.addEventListener('pointerleave', () => {
    globe.style.setProperty('--core-tilt-x', '0deg')
    globe.style.setProperty('--core-tilt-y', '0deg')
  }, { passive: true })
}

/**
 * @param {{
 *   revReel?: number,
 *   solde?: number,
 *   tauxCh?: number,
 *   variablesPct?: number,
 *   debtRate?: number,
 *   primaryGoalName?: string,
 *   primaryGoalProgress?: number
 * }} metrics
 */
export function updateNexoraCore(metrics = {}) {
  const panel = document.getElementById('nexora-core-panel')
  const globe = document.getElementById('nexora-core-globe')
  const healthEl = document.getElementById('nexora-core-health')
  const riskEl = document.getElementById('nexora-core-risk')
  const balanceEl = document.getElementById('nexora-core-balance')
  const goalEl = document.getElementById('nexora-core-goal')
  const detailEl = document.getElementById('nexora-core-detail')
  const ringEl = document.getElementById('nexora-core-health-ring')

  if (!panel || !globe) return

  const income = Number(metrics.revReel || 0)
  const balance = Number(metrics.solde || 0)
  const chargesRate = Number(metrics.tauxCh || 0)
  const variableRate = Number(metrics.variablesPct || 0)
  const debtRate = Number(metrics.debtRate || 0)

  const health = income > 0
    ? clamp(100 - Math.max(0, chargesRate - 55) - Math.max(0, variableRate - 25) - Math.max(0, debtRate - 20) + Math.min(20, Math.max(0, balance / Math.max(1, income) * 100)), 12, 96)
    : 24
  const risk = clamp(100 - health, 8, 88)

  globe.style.setProperty('--core-health', `${Math.round(health)}`)
  globe.style.setProperty('--core-risk', `${Math.round(risk)}`)
  panel.dataset.health = health >= 72 ? 'solid' : health >= 45 ? 'watch' : 'fragile'

  if (healthEl) healthEl.textContent = income > 0 ? `${Math.round(health)}% · ${healthLabel(health)}` : '—'
  if (riskEl) riskEl.textContent = income > 0 ? `${riskLabel(risk)} (${Math.round(risk)}%)` : '—'
  if (balanceEl) balanceEl.textContent = income > 0 ? formatEuro(balance) : '—'
  if (goalEl) {
    const name = metrics.primaryGoalName || 'Aucun objectif principal'
    const pct = Number(metrics.primaryGoalProgress)
    goalEl.textContent = Number.isFinite(pct) && pct > 0
      ? `${name} · ${Math.round(pct)}%`
      : name
  }
  if (detailEl) {
    detailEl.textContent = income > 0
      ? `Charges ${chargesRate}% · Variables ${variableRate}% · Lecture unifiée Nexora Core.`
      : 'Complète ton budget pour activer le centre de contrôle.'
  }
  if (ringEl) ringEl.style.strokeDashoffset = `${264 - (264 * health) / 100}`

  bindGlobeTilt(panel)
}

export function openNexoraCoreAction() {
  if (typeof window.showSection === 'function') {
    const target = document.getElementById('priority-action-title')?.dataset?.targetSection || 'plan'
    window.showSection(target)
    return
  }
  window.showToast?.('Ouvre le plan financier pour la prochaine action.')
}

export default { updateNexoraCore, openNexoraCoreAction }
