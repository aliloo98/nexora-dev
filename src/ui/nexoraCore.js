/**
 * Nexora Core V8 — Financial Rings (concentric static rings & typographic center)
 */

import { gsap } from 'gsap'

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const isCoarsePointer = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const GOLDEN_ANGLE = 137.508

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
let globeMotionReady = false
let graphBound = false
let lastGraphNodes = []
let activeGraphButton = null
let currentCenterDataType = 'balance' // 'balance' or 'score'
let lastCoreMetrics = null

const CORE_GRAPH_LIMIT = 8

export function setNexoraCoreMotionActive(active) {
  const panel = document.getElementById('nexora-core-panel')
  if (!panel) return
  if (active) {
    if (!globeMotionReady && !prefersReducedMotion()) initGlobeSignature(panel)
  } else {
    teardownNexoraCoreMotion()
  }
}

const formatDateLabel = (value) => {
  if (!value) return 'Échéance à définir'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Échéance à définir'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const buildGraphNodes = ({ goals = [], debts = [] }) => {
  const debugIcons = ['🏠', '✈', '🛡', '💳']

  const goalItems = (Array.isArray(goals) ? goals : [])
    .filter((goal) => goal && (goal.name || goal.target))
    .map((goal) => {
      const target = Number(goal.target) || 0
      const current = Number(goal.current) || 0
      const remaining = Math.max(0, target - current)
      const progress = target > 0 ? clamp(Math.round((current / target) * 100), 0, 100) : 0
      return {
        kind: 'goal',
        name: goal.name || 'Objectif',
        icon: goal.icon || '🎯',
        target,
        remaining,
        progress,
        due: formatDateLabel(goal.targetDate),
        amountLabel: target > 0 ? `${formatEuro(remaining)} restants` : 'À compléter'
      }
    })
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 4)

  const debtItems = (Array.isArray(debts) ? debts : [])
    .filter((debt) => Number(debt?.remaining) > 0)
    .map((debt) => ({
      kind: 'debt',
      name: debt.name || 'Dette',
      icon: '💸',
      remaining: Number(debt.remaining) || 0,
      monthly: Number(debt.monthly) || 0,
      priority: debt.priority || 'Normale',
      impact: debt.impact || 'Standard',
      rate: debt.rate ? `${Number(debt.rate)}%` : null,
      due: debt.dueDate ? formatDateLabel(debt.dueDate) : 'Mensualité à suivre',
      amountLabel: `${formatEuro(debt.remaining)} restants`
    }))
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 4)

  const merged = [...goalItems, ...debtItems].slice(0, CORE_GRAPH_LIMIT)

  return merged.map((node, index) => {
    const baseAngle = (GOLDEN_ANGLE * (index + 1)) % 360
    
    // Orbite Objectifs : 38% à 42% (sur le cercle principal) | Orbite Dettes : 45% à 48% (sur le cercle externe, max 50%)
    const radius = node.kind === 'goal' 
      ? clamp(38 + (index % 4) * 1.5, 38, 42) 
      : clamp(45 + (index % 4) * 1.2, 45, 48.5)
    
    const angleRad = (baseAngle * Math.PI) / 180
    const x = 50 + Math.cos(angleRad) * radius
    const y = 50 + Math.sin(angleRad) * radius

    return {
      ...node,
      icon: debugIcons[index % 4], // Remplacement temporaire pour debug
      size: 24, // Taille temporaire pour debug
      angle: baseAngle,
      radius,
      x,
      y
    }
  })
}

const renderCenterData = () => {
  const valueEl = document.getElementById('nexora-core-center-value')
  const labelEl = document.getElementById('nexora-core-center-label')
  if (!valueEl || !labelEl) return

  if (!lastCoreMetrics || !lastCoreMetrics.revReel || Number(lastCoreMetrics.revReel) <= 0) {
    valueEl.textContent = '—'
    labelEl.textContent = 'Solde fin de cycle'
    return
  }

  const income = Number(lastCoreMetrics.revReel || 0)
  const balance = Number(lastCoreMetrics.solde || 0)
  const chargesRate = Number(lastCoreMetrics.tauxCh || 0)
  const variableRate = Number(lastCoreMetrics.variablesPct || 0)
  const debtRate = Number(lastCoreMetrics.debtRate || 0)

  const health = clamp(100 - Math.max(0, chargesRate - 55) - Math.max(0, variableRate - 30) - Math.max(0, debtRate - 20) + Math.min(15, Math.max(0, balance / Math.max(1, income) * 100)), 10, 100)

  if (currentCenterDataType === 'balance') {
    valueEl.textContent = formatEuro(balance)
    labelEl.textContent = 'Solde fin de cycle'
  } else {
    valueEl.textContent = `${Math.round(health)}`
    labelEl.textContent = 'Score Nexora'
  }
}

const hideCoreTooltip = (tooltip) => {
  if (!tooltip) return
  if (tooltip.dataset.pinned === 'true') return
  if (!prefersReducedMotion()) {
    gsap.to(tooltip, {
      autoAlpha: 0,
      scale: 0.95,
      y: 4,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        tooltip.hidden = true
        tooltip.innerHTML = ''
      }
    })
    return
  }
  tooltip.hidden = true
  tooltip.innerHTML = ''
}

const showCoreTooltip = (tooltip, node, button, pinned = false) => {
  if (!tooltip || !node || !button) return
  tooltip.hidden = false
  if (pinned) {
    tooltip.dataset.pinned = 'true'
    tooltip.classList.add('is-pinned')
  } else if (tooltip.dataset.pinned === 'true') {
    return
  }
  
  if (node.kind === 'goal') {
    tooltip.innerHTML = `
      <span class="nexora-core-tooltip-kind nexora-core-tooltip-kind--goal">Objectif</span>
      <strong>${node.name}</strong>
      <span class="nexora-core-tooltip-amount">Cible : ${formatEuro(node.target)}</span>
      <span class="nexora-core-tooltip-amount">Restant : ${formatEuro(node.remaining)}</span>
      <span class="nexora-core-tooltip-progress">Progression : ${node.progress}%</span>
      <span class="nexora-core-tooltip-due">${node.due}</span>
      ${pinned ? '<button class="nexora-core-tooltip-close" type="button" aria-label="Fermer">✕</button>' : ''}
    `
  } else {
    tooltip.innerHTML = `
      <span class="nexora-core-tooltip-kind nexora-core-tooltip-kind--debt">Dette</span>
      <strong>${node.name}</strong>
      <span class="nexora-core-tooltip-amount">Capital restant : ${formatEuro(node.remaining)}</span>
      <span class="nexora-core-tooltip-monthly">Mensualité : ${formatEuro(node.monthly)}/mois</span>
      <span class="nexora-core-tooltip-priority">Priorité : ${node.priority}</span>
      <span class="nexora-core-tooltip-impact">Impact budget : ${node.impact}</span>
      ${pinned ? '<button class="nexora-core-tooltip-close" type="button" aria-label="Fermer">✕</button>' : ''}
    `
  }

  if (pinned) {
    const closeBtn = tooltip.querySelector('.nexora-core-tooltip-close')
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation()
        tooltip.dataset.pinned = 'false'
        tooltip.classList.remove('is-pinned')
        setActiveSatellite(null)
        hideCoreTooltip(tooltip)
      }
    }
  }

  // Position dynamically above the button relative to the stage
  const buttonRect = button.getBoundingClientRect()
  const stage = document.getElementById('nexora-core-stage')
  if (stage) {
    const stageRect = stage.getBoundingClientRect()
    const x = buttonRect.left - stageRect.left + buttonRect.width / 2
    const y = buttonRect.top - stageRect.top
    
    tooltip.style.left = `${x}px`
    tooltip.style.top = `${y - 12}px`
    tooltip.style.bottom = 'auto'
  }

  if (!prefersReducedMotion()) {
    gsap.fromTo(
      tooltip,
      { autoAlpha: 0, scale: 0.9, y: 5 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.28, ease: 'power3.out', overwrite: 'auto' }
    )
  }
}

const setActiveSatellite = (button) => {
  const tooltip = document.getElementById('nexora-core-tooltip')
  if (tooltip?.dataset?.pinned === 'true' && button !== activeGraphButton) return
  if (activeGraphButton === button) return
  const graph = document.getElementById('nexora-core-graph')
  
  if (activeGraphButton) {
    activeGraphButton.classList.remove('is-active')
    if (!prefersReducedMotion()) {
      gsap.to(activeGraphButton, { '--node-scale': 1, duration: 0.25 })
    }
  }
  
  activeGraphButton = button
  
  if (button) {
    button.classList.add('is-active')
    if (graph) graph.classList.add('has-active-node')
    if (!prefersReducedMotion()) {
      gsap.to(button, { '--node-scale': 1.35, duration: 0.35, ease: 'back.out(2)' })
    }
  } else {
    if (graph) graph.classList.remove('has-active-node')
  }
}

const renderCoreGraph = (panel, payload = {}) => {
  const graph = panel.querySelector('#nexora-core-graph')
  const tooltip = panel.querySelector('#nexora-core-tooltip')
  const globe = panel.querySelector('#nexora-core-globe')
  if (!graph || !globe) return

  const nodes = buildGraphNodes(payload)
  lastGraphNodes = nodes

  // DEBUG CONSOLE LOG FOR AUDIT
  console.log('[NexoraCore debug] Rendered nodes:', {
    goalsCount: (payload.goals || []).length,
    debtsCount: (payload.debts || []).length,
    nodesList: nodes.map((n, i) => {
      const rad = (n.angle * Math.PI) / 180
      // Polar coordinates relative to center (50%, 50%)
      const x = 50 + n.radius * Math.cos(rad)
      const y = 50 + n.radius * Math.sin(rad)
      return {
        index: i,
        kind: n.kind,
        name: n.name,
        icon: n.icon,
        radius: `${n.radius.toFixed(1)}%`,
        angle: `${n.angle.toFixed(1)}deg`,
        posX: `${x.toFixed(1)}%`,
        posY: `${y.toFixed(1)}%`
      }
    })
  })
  
  graph.innerHTML = nodes.map((node, index) => {
    // Label characters: icon or first letter
    const labelChar = node.icon || (node.name ? node.name.trim().charAt(0).toUpperCase() : '?')
    
    return `
      <div
        class="nexora-core-satellite-rig"
      >
        <button
          type="button"
          class="nexora-core-orbit-node nexora-core-orbit-node--${node.kind}"
          data-node-index="${index}"
          style="--orbit-size:${node.size}px; --node-x:${node.x.toFixed(3)}%; --node-y:${node.y.toFixed(3)}%;"
          aria-label="${node.name} · ${node.amountLabel}"
        >
          <span class="nexora-core-orbit-node-content">${labelChar}</span>
        </button>
      </div>
    `
  }).join('')

  if (graphBound) return
  graphBound = true

  graph.addEventListener('pointerover', (event) => {
    const button = event.target.closest?.('.nexora-core-orbit-node')
    if (!button) return hideCoreTooltip(tooltip)
    const node = lastGraphNodes[Number(button.dataset.nodeIndex)]
    setActiveSatellite(button)
    showCoreTooltip(tooltip, node, button)
  }, { passive: true })

  graph.addEventListener('click', (event) => {
    const button = event.target.closest?.('.nexora-core-orbit-node')
    if (!button) {
      if (tooltip.dataset.pinned === 'true') {
        tooltip.dataset.pinned = 'false'
        tooltip.classList.remove('is-pinned')
        setActiveSatellite(null)
        hideCoreTooltip(tooltip)
      }
      return
    }
    const node = lastGraphNodes[Number(button.dataset.nodeIndex)]
    if (activeGraphButton === button && tooltip.dataset.pinned === 'true') {
      tooltip.dataset.pinned = 'false'
      tooltip.classList.remove('is-pinned')
      hideCoreTooltip(tooltip)
      return
    }
    setActiveSatellite(button)
    showCoreTooltip(tooltip, node, button, true)
  })

  graph.addEventListener('focusin', (event) => {
    const button = event.target.closest?.('.nexora-core-orbit-node')
    if (!button) return
    const node = lastGraphNodes[Number(button.dataset.nodeIndex)]
    setActiveSatellite(button)
    showCoreTooltip(tooltip, node, button)
  })

  graph.addEventListener('pointerout', (event) => {
    if (event.relatedTarget && graph.contains(event.relatedTarget)) return
    if (tooltip.dataset.pinned === 'true') return
    setActiveSatellite(null)
    hideCoreTooltip(tooltip)
  }, { passive: true })

  graph.addEventListener('blur', () => {
    if (tooltip.dataset.pinned === 'true') return
    setActiveSatellite(null)
    hideCoreTooltip(tooltip)
  }, true)
}

const initGlobeSignature = (panel) => {
  if (!panel || globeMotionReady || prefersReducedMotion()) return
  const globe = panel.querySelector('#nexora-core-globe')
  if (!globe) return
  globeMotionReady = true
}

const bindGlobeTilt = (root) => {
  if (tiltBound || prefersReducedMotion() || isCoarsePointer()) return

  const globe = root?.querySelector?.('#nexora-core-globe')
  if (!globe) return
  tiltBound = true

  const tiltX = gsap.quickTo(globe, 'rotationX', { duration: 0.85, ease: 'power2.out' })
  const tiltY = gsap.quickTo(globe, 'rotationY', { duration: 0.85, ease: 'power2.out' })

  const reset = () => {
    tiltX(0)
    tiltY(0)
  }

  const onMove = (event) => {
    const rect = globe.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clamp((event.clientX - cx) / (rect.width / 2), -1, 1)
    const dy = clamp((event.clientY - cy) / (rect.height / 2), -1, 1)
    tiltX(dy * -3.5)
    tiltY(dx * 4.5)
  }

  root.addEventListener('pointermove', onMove, { passive: true })
  root.addEventListener('pointerleave', reset, { passive: true })
}

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

  // Save metrics payload for toggle rendering
  lastCoreMetrics = { ...metrics }

  const income = Number(metrics.revReel || 0)
  const balance = Number(metrics.solde || 0)
  const chargesRate = Number(metrics.tauxCh || 0)
  const variableRate = Number(metrics.variablesPct || 0)
  const debtRate = Number(metrics.debtRate || 0)

  const health = income > 0
    ? clamp(100 - Math.max(0, chargesRate - 55) - Math.max(0, variableRate - 30) - Math.max(0, debtRate - 20) + Math.min(15, Math.max(0, balance / Math.max(1, income) * 100)), 10, 100)
    : 20
  const risk = clamp(100 - health, 0, 100)

  globe.style.setProperty('--core-health', `${Math.round(health)}`)
  globe.style.setProperty('--core-risk', `${Math.round(risk)}`)
  
  // Set up center value toggle click listener
  const centerDataEl = document.getElementById('nexora-core-center-data')
  if (centerDataEl && !centerDataEl.dataset.bound) {
    centerDataEl.dataset.bound = 'true'
    centerDataEl.addEventListener('click', () => {
      currentCenterDataType = currentCenterDataType === 'balance' ? 'score' : 'balance'
      renderCenterData()
    })
  }

  // Draw central value typography
  renderCenterData()

  // Apply correct gradient stroke to the ring matching health
  if (ringEl) {
    let gradId = 'nexora-ring-grad-watch'
    if (health >= 85) gradId = 'nexora-ring-grad-radiant'
    else if (health >= 65) gradId = 'nexora-ring-grad-solid'
    else if (health >= 45) gradId = 'nexora-ring-grad-watch'
    else gradId = 'nexora-ring-grad-fragile'

    ringEl.setAttribute('stroke', `url(#${gradId})`)

    const tone = health >= 85 ? 'radiant' : health >= 65 ? 'solid' : health >= 45 ? 'watch' : 'fragile'
    globe.dataset.coreTone = tone
    panel.dataset.coreTone = tone
    panel.dataset.health = tone === 'radiant' || tone === 'solid' ? 'solid' : tone === 'watch' ? 'watch' : 'fragile'

    const strokeOffset = 264 - (264 * health) / 100
    if (prefersReducedMotion()) {
      ringEl.style.strokeDashoffset = `${strokeOffset}`
    } else {
      gsap.to(ringEl, {
        strokeDashoffset: strokeOffset,
        duration: 0.95,
        ease: 'power3.out',
        overwrite: 'auto'
      })
    }
  }

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

  renderCoreGraph(panel, {
    goals: metrics.goals,
    debts: metrics.debts,
    revReel: income,
    solde: balance,
    targetSavings: metrics.targetSavings,
    health,
    risk
  })

  const dashboardVisible = !document.getElementById('section-dashboard')?.hidden
  if (dashboardVisible) {
    initGlobeSignature(panel)
    bindGlobeTilt(panel)
  }
}

export function openNexoraCoreAction() {
  if (typeof window.showSection === 'function') {
    const target = document.getElementById('priority-action-title')?.dataset?.targetSection || 'plan'
    window.showSection(target)
    return
  }
  window.showToast?.('Ouvre le plan financier pour la prochaine action.')
}

export function teardownNexoraCoreMotion() {
  globeMotionReady = false
  tiltBound = false
}

if (typeof window !== 'undefined') {
  window.addEventListener?.('beforeunload', teardownNexoraCoreMotion)
}

export default {
  updateNexoraCore,
  openNexoraCoreAction,
  teardownNexoraCoreMotion,
  setNexoraCoreMotionActive
}
