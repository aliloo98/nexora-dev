/**
 * Nexora Core V7 — Masterpiece (globe signature + métriques).
 * Animations visuelles GSAP uniquement — logique métier inchangée.
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
let globeMotionCtx = null
let graphBound = false
let lastGraphNodes = []
let activeGraphButton = null
const CORE_GRAPH_LIMIT = 8

const killGlobeMotion = () => {
  if (globeMotionCtx) {
    globeMotionCtx.revert()
    globeMotionCtx = null
  }
  globeMotionReady = false
}

export function setNexoraCoreMotionActive(active) {
  const panel = document.getElementById('nexora-core-panel')
  if (!panel) return
  if (active) {
    if (!globeMotionReady && !prefersReducedMotion()) initGlobeSignature(panel)
  } else {
    killGlobeMotion()
  }
}

const formatDateLabel = (value) => {
  if (!value) return 'Échéance à définir'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Échéance à définir'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const buildGraphNodes = ({ goals = [], debts = [] }) => {
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
  const maxRemaining = merged.reduce((max, node) => Math.max(max, node.remaining), 0) || 1

  return merged.map((node, index) => {
    const baseAngle = (GOLDEN_ANGLE * (index + 1)) % 360
    // Orbite Objectifs : 72% à 88% | Orbite Dettes : 96% à 116%
    const radius = node.kind === 'goal' 
      ? clamp(72 + (index % 4) * 4, 72, 88) 
      : clamp(96 + (index % 4) * 5, 96, 116)
    
    return {
      ...node,
      size: clamp(8 + Math.sqrt(node.remaining / maxRemaining) * 20, 8, 28),
      angle: baseAngle,
      radius,
      speed: node.kind === 'goal' ? 40 + index * 5 : 55 + index * 6
    }
  })
}

const applyReactorVisualState = (globe, panel, health, risk) => {
  if (!globe) return
  
  // Couleurs Premium Galaxie : Excellent (Vert-Or), Correct (Or), Fragile (Orange), Critique (Rouge)
  let tone = 'balanced'
  if (health >= 85) tone = 'radiant'     // Vert-Doré
  else if (health >= 65) tone = 'solid'  // Or
  else if (health >= 45) tone = 'watch'  // Orange
  else tone = 'fragile'                  // Rouge

  globe.dataset.coreTone = tone
  if (panel) panel.dataset.coreTone = tone

  const glowStrength = health >= 80 ? 1 : health >= 60 ? 0.8 : health >= 40 ? 0.6 : 0.4
  globe.style.setProperty('--core-glow-strength', String(glowStrength))
  globe.style.setProperty('--core-reactor-scale', String(0.95 + (health / 100) * 0.1))

  const nucleus = globe.querySelector('.nexora-core-nucleus')
  if (nucleus && !prefersReducedMotion()) {
    gsap.to(nucleus, {
      scale: 1 + (health / 100) * 0.05,
      opacity: 0.8 + (health / 100) * 0.2,
      duration: 1.5,
      ease: 'power2.inOut',
      overwrite: 'auto'
    })
  }
}

const hideCoreTooltip = (tooltip) => {
  if (!tooltip) return
  if (tooltip.dataset.pinned === 'true') return
  if (!prefersReducedMotion()) {
    gsap.to(tooltip, {
      autoAlpha: 0,
      y: 6,
      duration: 0.22,
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

const showCoreTooltip = (tooltip, node, pinned = false) => {
  if (!tooltip || !node) return
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
      <span class="nexora-core-tooltip-amount">${node.amountLabel}</span>
      <span class="nexora-core-tooltip-progress"><em>Progression</em> ${node.progress}%</span>
      <span class="nexora-core-tooltip-due">${node.due}</span>
      ${pinned ? '<button class="nexora-core-tooltip-close" type="button" aria-label="Fermer">✕</button>' : ''}
    `
  } else {
    tooltip.innerHTML = `
      <span class="nexora-core-tooltip-kind nexora-core-tooltip-kind--debt">Dette</span>
      <strong>${node.name}</strong>
      <span class="nexora-core-tooltip-amount">${node.amountLabel}</span>
      <span class="nexora-core-tooltip-monthly"><em>Mensualité</em> ${formatEuro(node.monthly)}</span>
      <span class="nexora-core-tooltip-priority"><em>Priorité</em> ${node.priority}</span>
      <span class="nexora-core-tooltip-impact"><em>Impact</em> ${node.impact}</span>
      ${node.rate ? `<span class="nexora-core-tooltip-rate"><em>Taux</em> ${node.rate}</span>` : ''}
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

  if (!prefersReducedMotion()) {
    gsap.fromTo(
      tooltip,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out', overwrite: 'auto' }
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
      gsap.to(activeGraphButton, { scale: 1, duration: 0.3 })
    }
  }
  
  activeGraphButton = button
  
  if (button) {
    button.classList.add('is-active')
    if (graph) graph.classList.add('has-active-node')
    if (!prefersReducedMotion()) {
      gsap.to(button, { scale: 1.4, duration: 0.4, ease: 'back.out(2)' })
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
  graph.innerHTML = nodes.map((node, index) => `
    <div
      class="nexora-core-satellite-rig"
      style="--orbit-angle:${node.angle}deg; --orbit-radius:${node.radius}%; --orbit-speed:${node.speed}s;"
    >
      <button
        type="button"
        class="nexora-core-orbit-node nexora-core-orbit-node--${node.kind}"
        data-node-index="${index}"
        style="--orbit-size:${node.size}px;"
        aria-label="${node.name} · ${node.amountLabel}"
      ></button>
    </div>
  `).join('')

  const income = Number(payload.revReel || 0)
  const balance = Number(payload.solde || 0)
  const targetSavings = Number(payload.targetSavings || 0)
  const savingsRatio = income > 0 ? clamp(balance / Math.max(targetSavings || income * 0.15, 1), 0, 1.2) : 0
  globe.style.setProperty('--core-savings', `${Math.round(savingsRatio * 100)}`)
  globe.style.setProperty('--core-risk-intensity', `${clamp(Number(payload.risk ?? (100 - (payload.health ?? 50))), 8, 88)}`)

  if (graphBound) return
  graphBound = true

  graph.addEventListener('pointerover', (event) => {
    const button = event.target.closest?.('.nexora-core-orbit-node')
    if (!button) return hideCoreTooltip(tooltip)
    const node = lastGraphNodes[Number(button.dataset.nodeIndex)]
    setActiveSatellite(button)
    showCoreTooltip(tooltip, node)
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
    showCoreTooltip(tooltip, node, true)
  })

  graph.addEventListener('focusin', (event) => {
    const button = event.target.closest?.('.nexora-core-orbit-node')
    if (!button) return
    const node = lastGraphNodes[Number(button.dataset.nodeIndex)]
    setActiveSatellite(button)
    showCoreTooltip(tooltip, node)
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
  const sphere = panel.querySelector('.nexora-core-sphere')
  const nucleusGlow = panel.querySelector('.nexora-core-nucleus-glow')
  const shimmer = panel.querySelector('.nexora-core-shimmer')
  const reflection = panel.querySelector('.nexora-core-reflection')
  const haloOuter = panel.querySelector('.nexora-core-halo--outer')
  const haloInner = panel.querySelector('.nexora-core-halo--inner')
  const depthFar = panel.querySelector('.nexora-core-depth--far')

  if (!globe) return
  globeMotionReady = true

  globeMotionCtx = gsap.context(() => {
    gsap.set(globe, { transformPerspective: 1100, transformStyle: 'preserve-3d' })

    if (sphere) {
      gsap.to(sphere, {
        rotation: 360,
        duration: 180,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    }

    if (nucleusGlow) {
      gsap.to(nucleusGlow, {
        scale: 1.1,
        opacity: 0.8,
        duration: 6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%'
      })
    }

    if (haloOuter) {
      gsap.to(haloOuter, {
        scale: 1.05,
        opacity: 0.7,
        duration: 7,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%'
      })
    }

    if (shimmer) {
      gsap.fromTo(
        shimmer,
        { xPercent: -130, opacity: 0 },
        { xPercent: 130, opacity: 0.6, duration: 8, repeat: -1, ease: 'power1.inOut', repeatDelay: 3 }
      )
    }

    if (reflection) {
      gsap.to(reflection, {
        xPercent: 10,
        opacity: 0.4,
        duration: 8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }

    gsap.to(globe, {
      y: -8,
      duration: 7,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    })

    if (depthFar) {
      gsap.to(depthFar, {
        scale: 1.05,
        opacity: 0.4,
        duration: 10,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }

    if (isCoarsePointer()) {
      gsap.to(globe, {
        rotation: 1,
        duration: 10,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }
  }, panel)
}

const bindGlobeTilt = (root) => {
  if (tiltBound || prefersReducedMotion() || isCoarsePointer()) return

  const globe = root?.querySelector?.('#nexora-core-globe')
  const stage = root?.querySelector?.('#nexora-core-stage')
  const depthFar = root?.querySelector?.('.nexora-core-depth--far')
  if (!globe) return
  tiltBound = true

  gsap.set(globe, { transformPerspective: 1100 })

  const tiltX = gsap.quickTo(globe, 'rotationX', { duration: 0.85, ease: 'power2.out' })
  const tiltY = gsap.quickTo(globe, 'rotationY', { duration: 0.85, ease: 'power2.out' })
  const parallaxX = stage ? gsap.quickTo(stage, 'x', { duration: 1, ease: 'power2.out' }) : null
  const parallaxY = stage ? gsap.quickTo(stage, 'y', { duration: 1, ease: 'power2.out' }) : null
  const depthFarX = depthFar ? gsap.quickTo(depthFar, 'x', { duration: 1.1, ease: 'power2.out' }) : null
  const depthFarY = depthFar ? gsap.quickTo(depthFar, 'y', { duration: 1.1, ease: 'power2.out' }) : null

  const setGlow = (xPct, yPct) => {
    globe.style.setProperty('--core-glow-x', `${xPct}%`)
    globe.style.setProperty('--core-glow-y', `${yPct}%`)
  }

  const reset = () => {
    tiltX(0)
    tiltY(0)
    parallaxX?.(0)
    parallaxY?.(0)
    depthFarX?.(0)
    depthFarY?.(0)
    gsap.to(globe, {
      '--core-glow-x': '50%',
      '--core-glow-y': '42%',
      duration: 0.85,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  setGlow(50, 42)

  const onMove = (event) => {
    const rect = globe.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clamp((event.clientX - cx) / (rect.width / 2), -1, 1)
    const dy = clamp((event.clientY - cy) / (rect.height / 2), -1, 1)
    tiltX(dy * -3.5)
    tiltY(dx * 4.5)
    parallaxX?.(dx * 6)
    parallaxY?.(dy * 5)
    depthFarX?.(dx * 12)
    depthFarY?.(dy * 8)
    setGlow(50 + dx * 14, 42 + dy * 12)
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

  const income = Number(metrics.revReel || 0)
  const balance = Number(metrics.solde || 0)
  const chargesRate = Number(metrics.tauxCh || 0)
  const variableRate = Number(metrics.variablesPct || 0)
  const debtRate = Number(metrics.debtRate || 0)

  // Calcul de santé simplifié pour la Galaxie
  const health = income > 0
    ? clamp(100 - Math.max(0, chargesRate - 55) - Math.max(0, variableRate - 30) - Math.max(0, debtRate - 20) + Math.min(15, Math.max(0, balance / Math.max(1, income) * 100)), 10, 100)
    : 20
  const risk = clamp(100 - health, 0, 100)

  globe.style.setProperty('--core-health', `${Math.round(health)}`)
  globe.style.setProperty('--core-risk', `${Math.round(risk)}`)
  
  // Mapping des tons pour le CSS
  let toneClass = 'fragile'
  if (health >= 85) toneClass = 'solid'
  else if (health >= 45) toneClass = 'watch'
  panel.dataset.health = toneClass
  
  applyReactorVisualState(globe, panel, health, risk)

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
    // Inject Legend if not present
    if (income > 0 && !panel.querySelector('.nexora-core-legend')) {
      const legend = document.createElement('div')
      legend.className = 'nexora-core-legend'
      legend.innerHTML = `
        <span class="nexora-core-legend--goal"><i></i> Objectifs</span>
        <span class="nexora-core-legend--debt"><i></i> Dettes</span>
      `
      detailEl.after(legend)
    }
  }
  if (ringEl) {
    if (prefersReducedMotion()) {
      ringEl.style.strokeDashoffset = `${264 - (264 * health) / 100}`
    } else {
      gsap.to(ringEl, {
        strokeDashoffset: 264 - (264 * health) / 100,
        duration: 0.95,
        ease: 'power3.out',
        overwrite: 'auto'
      })
    }
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
  killGlobeMotion()
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
