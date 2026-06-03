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
      progress: null,
      due: debt.dueDate ? formatDateLabel(debt.dueDate) : 'Mensualité à suivre',
      amountLabel: `${formatEuro(debt.remaining)} restants`
    }))
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 4)

  const merged = [...goalItems, ...debtItems].slice(0, CORE_GRAPH_LIMIT)
  const maxRemaining = merged.reduce((max, node) => Math.max(max, node.remaining), 0) || 1

  return merged.map((node, index) => {
    const baseAngle = (GOLDEN_ANGLE * (index + 1)) % 360
    const kindOffset = node.kind === 'debt' ? 22 : 0
    return {
      ...node,
      size: clamp(11 + Math.sqrt(node.remaining / maxRemaining) * 18, 11, 28),
      angle: (baseAngle + kindOffset) % 360,
      radius: clamp(30 + (index % 4) * 8 + (node.kind === 'debt' ? 5 : 0), 28, 58),
      speed: 32 + index * 4 + (node.kind === 'debt' ? 6 : 0)
    }
  })
}

const applyReactorVisualState = (globe, panel, health, risk) => {
  if (!globe) return
  const glowStrength = health >= 80 ? 1 : health >= 55 ? 0.78 : health >= 45 ? 0.55 : 0.38
  const riskTint = risk >= 55 ? 0.42 : risk >= 32 ? 0.2 : 0.08
  const savingsBoost = clamp((health - 40) / 60, 0, 1)

  globe.style.setProperty('--core-glow-strength', String(glowStrength))
  globe.style.setProperty('--core-risk-tint', String(riskTint))
  globe.style.setProperty('--core-reactor-scale', String(0.92 + savingsBoost * 0.12))
  globe.dataset.coreTone = health >= 80 ? 'radiant' : health >= 45 ? 'balanced' : 'cautious'

  if (panel) {
    panel.dataset.coreTone = globe.dataset.coreTone
  }

  const nucleus = globe.querySelector('.nexora-core-nucleus')
  if (nucleus && !prefersReducedMotion()) {
    gsap.to(nucleus, {
      scale: 0.96 + glowStrength * 0.08,
      opacity: 0.72 + glowStrength * 0.28,
      duration: 1.1,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }
}

const hideCoreTooltip = (tooltip) => {
  if (!tooltip) return
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

const showCoreTooltip = (tooltip, node) => {
  if (!tooltip || !node) return
  tooltip.hidden = false
  tooltip.innerHTML = `
    <span class="nexora-core-tooltip-kind nexora-core-tooltip-kind--${node.kind}">${node.kind === 'goal' ? 'Objectif' : 'Dette'}</span>
    <strong>${node.name}</strong>
    <span class="nexora-core-tooltip-amount">${node.amountLabel}</span>
    ${node.progress !== null ? `<span class="nexora-core-tooltip-progress"><em>Progression</em> ${node.progress}%</span>` : ''}
    <span class="nexora-core-tooltip-due">${node.due}</span>
  `
  if (!prefersReducedMotion()) {
    gsap.fromTo(
      tooltip,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out', overwrite: 'auto' }
    )
  }
}

const setActiveSatellite = (button) => {
  if (activeGraphButton === button) return
  if (activeGraphButton) activeGraphButton.classList.remove('is-active')
  activeGraphButton = button
  if (button) {
    button.classList.add('is-active')
    if (!prefersReducedMotion()) {
      gsap.fromTo(button, { scale: 1 }, { scale: 1.18, duration: 0.35, ease: 'back.out(2)' })
    }
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

  graph.addEventListener('focusin', (event) => {
    const button = event.target.closest?.('.nexora-core-orbit-node')
    if (!button) return
    const node = lastGraphNodes[Number(button.dataset.nodeIndex)]
    setActiveSatellite(button)
    showCoreTooltip(tooltip, node)
  })

  graph.addEventListener('pointerout', (event) => {
    if (event.relatedTarget && graph.contains(event.relatedTarget)) return
    setActiveSatellite(null)
    hideCoreTooltip(tooltip)
  }, { passive: true })

  graph.addEventListener('blur', () => {
    setActiveSatellite(null)
    hideCoreTooltip(tooltip)
  }, true)
}

const initGlobeSignature = (panel) => {
  if (!panel || globeMotionReady || prefersReducedMotion()) return

  const globe = panel.querySelector('#nexora-core-globe')
  const rigOuter = panel.querySelector('.nexora-core-orbit-rig--outer')
  const rigInner = panel.querySelector('.nexora-core-orbit-rig--inner')
  const sphere = panel.querySelector('.nexora-core-sphere')
  const reactor = panel.querySelector('.nexora-core-reactor')
  const nucleusGlow = panel.querySelector('.nexora-core-nucleus-glow')
  const shimmer = panel.querySelector('.nexora-core-shimmer')
  const reflection = panel.querySelector('.nexora-core-reflection')
  const haloOuter = panel.querySelector('.nexora-core-halo--outer')
  const haloInner = panel.querySelector('.nexora-core-halo--inner')
  const haloRisk = panel.querySelector('.nexora-core-halo--risk')
  const particles = panel.querySelectorAll('.nexora-core-particle')
  const dust = panel.querySelectorAll('.nexora-core-dust-particle')
  const depthFar = panel.querySelector('.nexora-core-depth--far')
  const depthMid = panel.querySelector('.nexora-core-depth--mid')
  const orbits = panel.querySelectorAll('.nexora-core-orbit')

  if (!globe) return
  globeMotionReady = true

  globeMotionCtx = gsap.context(() => {
    gsap.set(globe, { transformPerspective: 1100, transformStyle: 'preserve-3d' })

    if (rigOuter) {
      gsap.to(rigOuter, {
        rotation: 360,
        duration: 72,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    }

    if (rigInner) {
      gsap.to(rigInner, {
        rotation: -360,
        duration: 48,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    }

    if (sphere) {
      gsap.to(sphere, {
        rotation: 360,
        duration: 160,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    }

    if (reactor) {
      gsap.to(reactor, {
        rotation: -360,
        duration: 90,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    }

    orbits.forEach((orbit, index) => {
      gsap.to(orbit, {
        rotateZ: index % 2 === 0 ? '+=360' : '-=360',
        duration: 24 + index * 8,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    })

    if (nucleusGlow) {
      gsap.to(nucleusGlow, {
        scale: 1.12,
        opacity: 0.85,
        duration: 5.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%'
      })
    }

    if (haloOuter) {
      gsap.to(haloOuter, {
        scale: 1.06,
        opacity: 0.82,
        duration: 5.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%'
      })
    }

    if (haloInner) {
      gsap.to(haloInner, {
        scale: 1.03,
        opacity: 0.62,
        duration: 4.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
        delay: 0.8
      })
    }

    if (haloRisk) {
      gsap.to(haloRisk, {
        opacity: 0.35,
        scale: 1.04,
        duration: 6.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
        delay: 0.3
      })
    }

    if (shimmer) {
      gsap.fromTo(
        shimmer,
        { xPercent: -130, opacity: 0 },
        { xPercent: 130, opacity: 0.7, duration: 5.6, repeat: -1, ease: 'power1.inOut', repeatDelay: 2 }
      )
    }

    if (reflection) {
      gsap.to(reflection, {
        xPercent: 14,
        yPercent: -8,
        opacity: 0.5,
        duration: 6.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }

    particles.forEach((particle, index) => {
      gsap.to(particle, {
        x: `+=${4 + (index % 3) * 2}`,
        y: `+=${-3 - (index % 2)}`,
        opacity: 0.55,
        duration: 4.5 + index * 0.6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: index * 0.35
      })
    })

    dust.forEach((particle, index) => {
      gsap.set(particle, { opacity: 0.08 + (index % 5) * 0.04 })
      gsap.to(particle, {
        x: `+=${8 + (index % 4) * 4}`,
        y: `+=${-6 - (index % 3) * 3}`,
        opacity: 0.22,
        duration: 14 + (index % 6) * 2.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: index * 0.55
      })
    })

    gsap.to(globe, {
      y: -6,
      duration: 6.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    })

    if (depthFar) {
      gsap.to(depthFar, {
        scale: 1.04,
        opacity: 0.5,
        duration: 8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }

    if (isCoarsePointer()) {
      gsap.to(globe, {
        x: 4,
        rotation: 1.2,
        duration: 7.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: 0.5
      })
    }
  }, panel)
}

const bindGlobeTilt = (root) => {
  if (tiltBound || prefersReducedMotion() || isCoarsePointer()) return

  const globe = root?.querySelector?.('#nexora-core-globe')
  const stage = root?.querySelector?.('#nexora-core-stage')
  const depthFar = root?.querySelector?.('.nexora-core-depth--far')
  const depthMid = root?.querySelector?.('.nexora-core-depth--mid')
  const reactor = root?.querySelector?.('.nexora-core-reactor')
  if (!globe) return
  tiltBound = true

  gsap.set(globe, { transformPerspective: 1100 })

  const tiltX = gsap.quickTo(globe, 'rotationX', { duration: 0.85, ease: 'power2.out' })
  const tiltY = gsap.quickTo(globe, 'rotationY', { duration: 0.85, ease: 'power2.out' })
  const parallaxX = stage ? gsap.quickTo(stage, 'x', { duration: 1, ease: 'power2.out' }) : null
  const parallaxY = stage ? gsap.quickTo(stage, 'y', { duration: 1, ease: 'power2.out' }) : null
  const depthFarX = depthFar ? gsap.quickTo(depthFar, 'x', { duration: 1.1, ease: 'power2.out' }) : null
  const depthFarY = depthFar ? gsap.quickTo(depthFar, 'y', { duration: 1.1, ease: 'power2.out' }) : null
  const depthMidX = depthMid ? gsap.quickTo(depthMid, 'x', { duration: 0.95, ease: 'power2.out' }) : null
  const depthMidY = depthMid ? gsap.quickTo(depthMid, 'y', { duration: 0.95, ease: 'power2.out' }) : null
  const reactorX = reactor ? gsap.quickTo(reactor, 'x', { duration: 0.75, ease: 'power2.out' }) : null
  const reactorY = reactor ? gsap.quickTo(reactor, 'y', { duration: 0.75, ease: 'power2.out' }) : null

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
    depthMidX?.(0)
    depthMidY?.(0)
    reactorX?.(0)
    reactorY?.(0)
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
    tiltX(dy * -4.5)
    tiltY(dx * 5.5)
    parallaxX?.(dx * 8)
    parallaxY?.(dy * 6)
    depthFarX?.(dx * 14)
    depthFarY?.(dy * 10)
    depthMidX?.(dx * 9)
    depthMidY?.(dy * 7)
    reactorX?.(dx * 5)
    reactorY?.(dy * 4)
    setGlow(50 + dx * 16, 42 + dy * 14)
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

  const health = income > 0
    ? clamp(100 - Math.max(0, chargesRate - 55) - Math.max(0, variableRate - 25) - Math.max(0, debtRate - 20) + Math.min(20, Math.max(0, balance / Math.max(1, income) * 100)), 12, 96)
    : 24
  const risk = clamp(100 - health, 8, 88)

  globe.style.setProperty('--core-health', `${Math.round(health)}`)
  globe.style.setProperty('--core-risk', `${Math.round(risk)}`)
  panel.dataset.health = health >= 72 ? 'solid' : health >= 45 ? 'watch' : 'fragile'
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
