import { createMetricCard } from '../components/MetricCard.js'
import { evaluateCopilotState } from '../../coach/copilotEngine.js'
import { getTimeContext } from '../../time/timeEngine.js'
import { setupAmbientMotion, startGraphAmbientMotion, startDonutAmbientMotion, startProgressAmbientSweep } from '../../jarvis/motion/jarvisAmbientMotion.js'
import { setupViewportReveal, attachAmbientController } from './ambientHelpers.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

const fmtPct = (value) => {
  const pct = Number(value) || 0
  return `${Math.round(pct)}%`
}

/**
 * One-shot viewport observer for motion reveal
 * Triggers animation when element enters viewport and never replays
 */
// helpers extracted to ./ambientHelpers.js

/**
 * Ambient motion observer for visibility-aware continuous animation
 * Pauses/resumes ambient animation based on viewport visibility
 */




/**
 * Ambient motion for graph pulse
 * Subtle endpoint pulse and line intensity breathing
 */


/**
 * Ambient motion for donut pulse
 * Subtle perimeter pulse and segment breathing
 */


/**
 * Crée un KPI horizontal compact
 */
function createHorizontalKPI({ label, value, context, icon, tone = 'neutral' }, documentRef) {
  const kpi = documentRef.createElement('div')
  kpi.className = `kpi-horizontal kpi-horizontal--${tone}`
  
  const content = documentRef.createElement('div')
  content.style.flex = '1'
  
  const labelEl = documentRef.createElement('div')
  labelEl.className = 'kpi-horizontal__label'
  labelEl.textContent = label
  
  const valueEl = documentRef.createElement('div')
  valueEl.className = 'kpi-horizontal__value'
  valueEl.textContent = value
  
  const contextEl = documentRef.createElement('div')
  contextEl.className = 'kpi-horizontal__context'
  contextEl.textContent = context
  
  content.appendChild(labelEl)
  content.appendChild(valueEl)
  content.appendChild(contextEl)
  
  const iconEl = documentRef.createElement('div')
  iconEl.className = 'kpi-horizontal__icon'
  iconEl.textContent = icon
  
  kpi.appendChild(content)
  kpi.appendChild(iconEl)
  
  return kpi
}

/**
 * Crée un KPI compact pour le mode Simplifié
 */
function createCompactKPI({ label, value, context, tone = 'neutral' }, documentRef) {
  const kpi = documentRef.createElement('div')
  kpi.className = `kpi-compact-card kpi-compact-card--${tone}`
  
  const labelEl = documentRef.createElement('div')
  labelEl.className = 'kpi-compact-card__label'
  labelEl.textContent = label
  
  const valueEl = documentRef.createElement('div')
  valueEl.className = 'kpi-compact-card__value'
  valueEl.textContent = value
  
  const contextEl = documentRef.createElement('div')
  contextEl.className = 'kpi-compact-card__context'
  contextEl.textContent = context
  
  kpi.appendChild(labelEl)
  kpi.appendChild(valueEl)
  kpi.appendChild(contextEl)
  
  return kpi
}

/**
 * Crée un KPI d'analyse pour le mode Complet
 */
function createAnalysisKPI({ label, value, context, insight, icon, tone = 'neutral' }, documentRef) {
  const kpi = documentRef.createElement('div')
  kpi.className = 'kpi-analysis-card'
  
  const header = documentRef.createElement('div')
  header.className = 'kpi-analysis-card__header'
  
  const labelEl = documentRef.createElement('div')
  labelEl.className = 'kpi-analysis-card__label'
  labelEl.textContent = label
  
  const iconEl = documentRef.createElement('div')
  iconEl.className = 'kpi-analysis-card__icon'
  iconEl.textContent = icon
  
  header.appendChild(labelEl)
  header.appendChild(iconEl)
  
  const valueEl = documentRef.createElement('div')
  valueEl.className = 'kpi-analysis-card__value'
  valueEl.textContent = value
  
  const contextEl = documentRef.createElement('div')
  contextEl.className = 'kpi-analysis-card__context'
  contextEl.textContent = context
  
  const insightEl = documentRef.createElement('div')
  insightEl.className = 'kpi-analysis-card__insight'
  insightEl.textContent = insight
  
  kpi.appendChild(header)
  kpi.appendChild(valueEl)
  kpi.appendChild(contextEl)
  kpi.appendChild(insightEl)
  
  return kpi
}

/**
 * Crée une tuile Hero
 */
function createHeroTile({ label, value, context, tone = 'neutral', accent = 'none', compact = false, progress = null, trend = null, narrative = null }, documentRef) {
  const tile = documentRef.createElement('div')
  tile.className = `hero-tile hero-tile--${tone}${accent !== 'none' ? ` hero-tile--accent-${accent}` : ''}${compact ? ' hero-tile--compact' : ''}`
  
  const labelEl = documentRef.createElement('div')
  labelEl.className = 'hero-tile__label'
  labelEl.textContent = label
  
  const valueEl = documentRef.createElement('div')
  valueEl.className = 'hero-tile__value'
  valueEl.textContent = value
  
  const contextEl = documentRef.createElement('div')
  contextEl.className = 'hero-tile__context'
  contextEl.textContent = context
  
  tile.appendChild(labelEl)
  tile.appendChild(valueEl)
  tile.appendChild(contextEl)
  
  // Ajouter un élément narratif si spécifié
  if (narrative) {
    const narrativeEl = documentRef.createElement('div')
    narrativeEl.className = 'hero-tile__narrative'
    narrativeEl.textContent = narrative
    tile.appendChild(narrativeEl)
  }
  
  // Ajouter une barre de progression si spécifiée
  if (progress !== null) {
    const progressContainer = documentRef.createElement('div')
    progressContainer.className = 'hero-tile__progress'
    
    const progressBar = documentRef.createElement('div')
    progressBar.className = 'hero-tile__progress-bar'
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`
    
    if (progress > 75) {
      progressBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)'
    } else if (progress > 50) {
      progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)'
    } else {
      progressBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)'
    }
    
    progressContainer.appendChild(progressBar)
    tile.appendChild(progressContainer)
  }
  
  // Ajouter un indicateur de tendance si spécifié
  if (trend !== null) {
    const trendEl = documentRef.createElement('div')
    trendEl.className = 'hero-tile__trend'
    
    const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→'
    const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral'
    
    trendEl.innerHTML = `<span class="hero-tile__trend-icon ${trendClass}">${trendIcon}</span>`
    tile.appendChild(trendEl)
  }

  return tile
}

/**
 * Rendu du Dashboard - Version Compagnon Financier V5 Conscient du Temps
 * @param {Object} metrics - Métriques financières (revReel, fixReel, varReel, debtSummary, etc.)
 * @param {Object} options - Options additionnelles (documentRef, windowRef, viewedMonth)
 */
export function renderDashboardQuickView(metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)

  const monthSelectEl = documentRef.getElementById('monthSelect')
  const viewedMonthIso = options.viewedMonth || metrics.viewedMonthIso || (monthSelectEl ? monthSelectEl.value : null)
  const timeContext = getTimeContext(viewedMonthIso)

  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)
  const debtSummary = metrics.debtSummary || { total: 0, monthly: 0 }

  // Use source of truth metrics from updateAll() / computeCycleBalances()
  const solde = metrics.solde !== undefined ? Number(metrics.solde) : (revReel - fixReel - varReel)
  const soldeEstime = metrics.soldeEstime !== undefined ? Number(metrics.soldeEstime) : solde
  const totalDepRestant = metrics.totalDepRestant !== undefined ? Number(metrics.totalDepRestant) : 0
  const tauxCh = metrics.tauxCh !== undefined ? Number(metrics.tauxCh) : (revReel > 0 ? Math.round(((fixReel + varReel) / revReel) * 100) : 0)
  const variablesPct = metrics.variablesPct !== undefined ? Number(metrics.variablesPct) : (revReel > 0 ? Math.round((varReel / revReel) * 100) : 0)

  // Use pre-calculated Analytics metrics from updateAll()
  const savingsRate = metrics.savingsRate !== undefined ? Number(metrics.savingsRate) : (revReel > 0 ? ((solde / revReel) * 100) : 0)
  const annualProjection = metrics.annualProjection !== undefined ? Number(metrics.annualProjection) : (solde * 12)
  const safetyMargin = metrics.safetyMargin !== undefined ? Number(metrics.safetyMargin) : (revReel - fixReel)
  const goalProgressPct = metrics.goalProgressPct !== undefined ? Number(metrics.goalProgressPct) : Math.min(100, Math.max(0, savingsRate * 3))
  const goalTarget = metrics.goalTarget !== undefined ? Number(metrics.goalTarget) : (revReel * 0.2)

  // Calculs dérivés (only if not provided by source of truth)
  const totalExpenses = fixReel + varReel
  const savings = solde // Use source of truth
  const soldeFinMois = solde // Use source of truth
  const tauxCharges = tauxCh // Use source of truth
  const depenseMoyenneJour = totalExpenses > 0 ? Math.round(totalExpenses / 30) : 0

  // === CALCUL ÉVALUATION COPILOTE ===
  const copilotState = evaluateCopilotState(metrics, { timeContext })

  // 1. COPILOTE CONVERSATIONNEL
  const copilotTagEl = documentRef.getElementById('copilot-posture-tag')
  if (copilotTagEl) {
    copilotTagEl.textContent = copilotState.humanIndicator || copilotState.postureLabel
    copilotTagEl.className = `copilot-badge copilot-badge--${copilotState.posture.toLowerCase()}`
  }

  const copilotMsgEl = documentRef.getElementById('copilot-message-text')
  if (copilotMsgEl) copilotMsgEl.textContent = copilotState.copilotMessage

  const copilotActionBtn = documentRef.getElementById('copilot-action-btn')
  if (copilotActionBtn) {
    if (copilotState.action) {
      copilotActionBtn.style.display = 'inline-flex'
      copilotActionBtn.textContent = `⚡ ${copilotState.action.label}`
      copilotActionBtn.onclick = () => {
        if (typeof windowRef?.showSection === 'function') {
          windowRef.showSection(copilotState.action.targetSection)
        }
      }
    } else {
      copilotActionBtn.style.display = 'none'
    }
  }

  // 2. CARTE NARRATIVE "CE QUE J'AI REMARQUÉ"
  if (copilotState.understanding) {
    const headEl = documentRef.getElementById('understanding-headline')
    if (headEl) headEl.textContent = copilotState.understanding.headline

    const detEl = documentRef.getElementById('understanding-details')
    if (detEl) detEl.textContent = copilotState.understanding.details

    const landEl = documentRef.getElementById('understanding-landing')
    if (landEl) landEl.textContent = copilotState.understanding.landingText
  }

  // 3. TIMELINE RUBAN 1-LIGNE TEMPORELLE - REMOVED: Handled by updateWeekPlan() to avoid conflicts
  // Timeline is updated by updateWeekPlan() in index.html which is the official source for this component

  // 4. MODE COMPLET - CHARTS SVG DYNAMIQUES (SPRINTS 2 & 3)
  const isReducedMotion = typeof windowRef?.matchMedia === 'function' &&
    windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches

  // SPRINT 2: COURBE DE TRÉSORERIE 30 JOURS (TRUE SVG PATH-DRAW REVEAL)
  const linePath = documentRef.getElementById('treasury-line-path')
  const areaPath = documentRef.getElementById('treasury-area-path')
  const lineHighlight = documentRef.getElementById('treasury-line-highlight')
  const hoverDot = documentRef.getElementById('treasury-hover-dot')

  if (linePath && areaPath) {
    const yStart = Math.max(20, Math.min(100, 100 - (revReel / Math.max(1, revReel)) * 50))
    const yMid = Math.max(15, Math.min(105, 100 - (copilotState.resteAVivre / Math.max(1, revReel)) * 70))
    const yEnd = Math.max(10, Math.min(110, 100 - (soldeFinMois / Math.max(1, revReel)) * 80))
    
    const lineD = `M 0,${yStart} Q 250,${yMid} 500,${yEnd}`
    const areaD = `M 0,120 L 0,${yStart} Q 250,${yMid} 500,${yEnd} L 500,120 Z`

    const isInitialReveal = !linePath.dataset.motionState

    if (isReducedMotion) {
      linePath.style.transition = 'none'
      areaPath.style.transition = 'none'
      linePath.setAttribute('stroke-dasharray', 'none')
      linePath.setAttribute('stroke-dashoffset', '0')
      linePath.setAttribute('d', lineD)
      areaPath.setAttribute('d', areaD)
      if (lineHighlight) lineHighlight.setAttribute('d', lineD)
      areaPath.style.opacity = '1'
      if (hoverDot) {
        hoverDot.setAttribute('cx', '250')
        hoverDot.setAttribute('cy', String(yMid))
        hoverDot.style.opacity = '0.8'
      }
      linePath.dataset.motionState = 'complete'
    } else if (isInitialReveal) {
      // Set initial state for viewport-triggered reveal
      const pathLength = 520
      linePath.dataset.motionState = 'pending'
      linePath.setAttribute('d', lineD)
      areaPath.setAttribute('d', areaD)
      if (lineHighlight) lineHighlight.setAttribute('d', lineD)
      linePath.setAttribute('stroke-dasharray', String(pathLength))
      linePath.setAttribute('stroke-dashoffset', String(pathLength))
      areaPath.style.opacity = '0'

      if (hoverDot) {
        hoverDot.setAttribute('cx', '250')
        hoverDot.setAttribute('cy', String(yMid))
        hoverDot.style.opacity = '0'
        hoverDot.style.transform = 'scale(0.75)'
      }

      // Trigger animation only when element enters viewport
      setupViewportReveal(linePath, () => {
        linePath.dataset.motionState = 'running'
        if (typeof windowRef?.requestAnimationFrame === 'function') {
          windowRef.requestAnimationFrame(() => {
            linePath.style.transition = 'stroke-dashoffset 950ms cubic-bezier(0.16, 1, 0.3, 1)'
            areaPath.style.transition = 'opacity 700ms ease-out 400ms'
            linePath.setAttribute('stroke-dashoffset', '0')
            areaPath.style.opacity = '1'
            if (hoverDot) {
              hoverDot.style.transition = 'opacity 350ms ease-out 750ms, transform 350ms cubic-bezier(0.16, 1, 0.3, 1) 750ms'
              hoverDot.style.opacity = '0.85'
              hoverDot.style.transform = 'scale(1)'
            }
            // Mark complete after animation finishes. Use transitionend for robustness with a fallback timeout.
            const onLineTransitionEnd = (ev) => {
              if (ev.propertyName && ev.propertyName.indexOf('dashoffset') === -1 && ev.propertyName.indexOf('dasharray') === -1) return
              linePath.removeEventListener('transitionend', onLineTransitionEnd)
              linePath.dataset.motionState = 'complete'
              // Start ambient motion after reveal
              linePath.dataset.motionState = 'ambient'
              attachAmbientController(linePath, () => startGraphAmbientMotion(linePath, hoverDot))
            }
            linePath.addEventListener('transitionend', onLineTransitionEnd)
            // Fallback in case transitionend doesn't fire
            setTimeout(() => {
              linePath.removeEventListener('transitionend', onLineTransitionEnd)
              linePath.dataset.motionState = 'complete'
              linePath.dataset.motionState = 'ambient'
              attachAmbientController(linePath, () => startGraphAmbientMotion(linePath, hoverDot))
            }, 1200)
          })
        }
      })
    } else {
      // Subsequent updateAll calls: smooth geometry update without re-drawing line from left
      linePath.style.transition = 'd 600ms cubic-bezier(0.16, 1, 0.3, 1)'
      areaPath.style.transition = 'd 600ms cubic-bezier(0.16, 1, 0.3, 1)'
      linePath.setAttribute('d', lineD)
      areaPath.setAttribute('d', areaD)
      if (lineHighlight) lineHighlight.setAttribute('d', lineD)
      if (hoverDot) {
        hoverDot.setAttribute('cx', '250')
        hoverDot.setAttribute('cy', String(yMid))
      }
      // If already complete, start ambient motion
      if (linePath.dataset.motionState === 'complete') {
        linePath.dataset.motionState = 'ambient'
        attachAmbientController(linePath, () => startGraphAmbientMotion(linePath, hoverDot))
      }
    }
  }

  // SPRINT 3: DONUT CHART 360° (TRUE CONSTRUCTION REVEAL)
  const totalCircumference = 238.76
  const pctCh = revReel > 0 ? Math.min(100, Math.round((fixReel / revReel) * 100)) : 0
  const pctEp = revReel > 0 ? Math.min(100 - pctCh, Math.max(0, Math.round(savingsRate))) : 0
  const pctVar = Math.max(0, 100 - pctCh - pctEp)

  const lenCh = (pctCh / 100) * totalCircumference
  const lenEp = (pctEp / 100) * totalCircumference
  const lenVar = (pctVar / 100) * totalCircumference

  const segCharges = documentRef.getElementById('donut-segment-charges')
  const segEpargne = documentRef.getElementById('donut-segment-epargne')
  const segLibre = documentRef.getElementById('donut-segment-libre')

  if (segCharges && segEpargne && segLibre) {
    const isDonutInitialReveal = !segCharges.dataset.motionState

    if (isReducedMotion) {
      segCharges.style.transition = 'none'
      segEpargne.style.transition = 'none'
      segLibre.style.transition = 'none'
      segCharges.setAttribute('stroke-dasharray', `${lenCh} ${totalCircumference - lenCh}`)
      segCharges.setAttribute('stroke-dashoffset', '0')
      segEpargne.setAttribute('stroke-dasharray', `${lenEp} ${totalCircumference - lenEp}`)
      segEpargne.setAttribute('stroke-dashoffset', String(-lenCh))
      segLibre.setAttribute('stroke-dasharray', `${lenVar} ${totalCircumference - lenVar}`)
      segLibre.setAttribute('stroke-dashoffset', String(-(lenCh + lenEp)))
      segCharges.dataset.motionState = 'complete'
    } else if (isDonutInitialReveal) {
      // Set initial state for viewport-triggered reveal
      segCharges.dataset.motionState = 'pending'
      segCharges.setAttribute('stroke-dasharray', `0 ${totalCircumference}`)
      segCharges.setAttribute('stroke-dashoffset', '0')
      segEpargne.setAttribute('stroke-dasharray', `0 ${totalCircumference}`)
      segEpargne.setAttribute('stroke-dashoffset', '0')
      segLibre.setAttribute('stroke-dasharray', `0 ${totalCircumference}`)
      segLibre.setAttribute('stroke-dashoffset', '0')

      // Trigger construction only when element enters viewport
      setupViewportReveal(segCharges, () => {
        segCharges.dataset.motionState = 'running'
        if (typeof windowRef?.requestAnimationFrame === 'function') {
          windowRef.requestAnimationFrame(() => {
            const segTransition = 'stroke-dasharray 850ms cubic-bezier(0.16, 1, 0.3, 1), stroke-dashoffset 850ms cubic-bezier(0.16, 1, 0.3, 1)'
            segCharges.style.transition = segTransition
            segEpargne.style.transition = segTransition
            segLibre.style.transition = segTransition

            segCharges.setAttribute('stroke-dasharray', `${lenCh} ${totalCircumference - lenCh}`)
            segCharges.setAttribute('stroke-dashoffset', '0')
            segEpargne.setAttribute('stroke-dasharray', `${lenEp} ${totalCircumference - lenEp}`)
            segEpargne.setAttribute('stroke-dashoffset', String(-lenCh))
            segLibre.setAttribute('stroke-dasharray', `${lenVar} ${totalCircumference - lenVar}`)
            segLibre.setAttribute('stroke-dashoffset', String(-(lenCh + lenEp)))
            // Mark complete after animation finishes. Use transitionend for robustness with a fallback timeout.
            const onDonutTransitionEnd = (ev) => {
              if (ev.propertyName && ev.propertyName.indexOf('dasharray') === -1 && ev.propertyName.indexOf('dashoffset') === -1) return
              segCharges.removeEventListener('transitionend', onDonutTransitionEnd)
              segCharges.dataset.motionState = 'complete'
              // Start ambient motion after reveal
              segCharges.dataset.motionState = 'ambient'
              attachAmbientController(segCharges, () => startDonutAmbientMotion(segCharges, segEpargne))
            }
            segCharges.addEventListener('transitionend', onDonutTransitionEnd)
            setTimeout(() => {
              segCharges.removeEventListener('transitionend', onDonutTransitionEnd)
              segCharges.dataset.motionState = 'complete'
              segCharges.dataset.motionState = 'ambient'
              attachAmbientController(segCharges, () => startDonutAmbientMotion(segCharges, segEpargne))
            }, 1000)
          })
        }
      })
    } else {
      // Subsequent updates: smooth transition from previous state
      const segTransition = 'stroke-dasharray 500ms cubic-bezier(0.16, 1, 0.3, 1), stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)'
      segCharges.style.transition = segTransition
      segEpargne.style.transition = segTransition
      segLibre.style.transition = segTransition

      segCharges.setAttribute('stroke-dasharray', `${lenCh} ${totalCircumference - lenCh}`)
      segCharges.setAttribute('stroke-dashoffset', '0')
      segEpargne.setAttribute('stroke-dasharray', `${lenEp} ${totalCircumference - lenEp}`)
      segEpargne.setAttribute('stroke-dashoffset', String(-lenCh))
      segLibre.setAttribute('stroke-dasharray', `${lenVar} ${totalCircumference - lenVar}`)
      segLibre.setAttribute('stroke-dashoffset', String(-(lenCh + lenEp)))
      // If already complete, start ambient motion
      if (segCharges.dataset.motionState === 'complete') {
        segCharges.dataset.motionState = 'ambient'
        attachAmbientController(segCharges, () => startDonutAmbientMotion(segCharges, segEpargne))
      }
    }
  }

  const donutCenterPct = documentRef.getElementById('donut-center-pct')
  if (donutCenterPct) {
    if (!isReducedMotion && !donutCenterPct.dataset.animated && typeof windowRef?.requestAnimationFrame === 'function') {
      donutCenterPct.dataset.animated = 'true'
      const startTime = Date.now()
      const duration = 700
      const targetVal = pctCh
      const animateCount = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(1, elapsed / duration)
        const currentVal = Math.round(targetVal * progress)
        donutCenterPct.textContent = `${currentVal}%`
        if (progress < 1) {
          windowRef.requestAnimationFrame(animateCount)
        } else {
          donutCenterPct.textContent = `${targetVal}%`
        }
      }
      windowRef.requestAnimationFrame(animateCount)
    } else {
      donutCenterPct.textContent = `${pctCh}%`
    }
  }

  const legCh = documentRef.getElementById('donut-leg-charges')
  if (legCh) legCh.textContent = `${pctCh}%`
  const legEp = documentRef.getElementById('donut-leg-epargne')
  if (legEp) legEp.textContent = `${pctEp}%`
  const legVar = documentRef.getElementById('donut-leg-variables')
  if (legVar) legVar.textContent = `${pctVar}%`

  // ANALYSES & DETTES - Use pre-calculated metrics from updateAll()
  const analysisProjVal = documentRef.getElementById('analysis-projection-value')
  if (analysisProjVal) analysisProjVal.textContent = fmt(annualProjection)

  const analysisProjTrend = documentRef.getElementById('analysis-projection-trend')
  if (analysisProjTrend) {
    analysisProjTrend.textContent = annualProjection > 0 ? 'Trajectoire positive' : annualProjection < 0 ? 'Trajectoire négative' : 'Trajectoire neutre'
  }

  const analysisTrendVal = documentRef.getElementById('analysis-trend-value')
  if (analysisTrendVal) analysisTrendVal.textContent = fmtPct(savingsRate)

  const analysisRatioVal = documentRef.getElementById('analysis-ratio-value')
  if (analysisRatioVal) analysisRatioVal.textContent = fmt(safetyMargin)

  // GOAL PROGRESS BAR (TRUE 0 -> TARGET FILL REVEAL)
  const completeGoalBar = documentRef.getElementById('complete-goal-bar')
  const completeGoalText = documentRef.getElementById('complete-goal-progress-text')
  if (completeGoalBar && completeGoalText) {
    const isGoalInitialReveal = !completeGoalBar.dataset.motionState

    if (isReducedMotion) {
      completeGoalBar.style.transition = 'none'
      completeGoalBar.style.width = `${goalProgressPct}%`
      completeGoalBar.dataset.motionState = 'complete'
    } else if (isGoalInitialReveal) {
      // Set initial state for viewport-triggered reveal
      completeGoalBar.dataset.motionState = 'pending'
      completeGoalBar.style.width = '0%'

      // Trigger fill only when element enters viewport
      setupViewportReveal(completeGoalBar, () => {
        completeGoalBar.dataset.motionState = 'running'
        if (typeof windowRef?.requestAnimationFrame === 'function') {
          windowRef.requestAnimationFrame(() => {
            completeGoalBar.style.transition = 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)'
            completeGoalBar.style.width = `${goalProgressPct}%`
            // Mark complete after animation finishes. Use transitionend for robustness with a fallback timeout.
            const onGoalTransitionEnd = (ev) => {
              if (ev.propertyName && ev.propertyName !== 'width') return
              completeGoalBar.removeEventListener('transitionend', onGoalTransitionEnd)
              completeGoalBar.dataset.motionState = 'complete'
              // Start ambient motion after reveal
              completeGoalBar.dataset.motionState = 'ambient'
              attachAmbientController(completeGoalBar, () => startProgressAmbientSweep(completeGoalBar))
            }
            completeGoalBar.addEventListener('transitionend', onGoalTransitionEnd)
            setTimeout(() => {
              completeGoalBar.removeEventListener('transitionend', onGoalTransitionEnd)
              completeGoalBar.dataset.motionState = 'complete'
              completeGoalBar.dataset.motionState = 'ambient'
              attachAmbientController(completeGoalBar, () => startProgressAmbientSweep(completeGoalBar))
            }, 900)
          })
        }
      })
    } else {
      completeGoalBar.style.transition = 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)'
      completeGoalBar.style.width = `${goalProgressPct}%`
      // If already complete, start ambient motion
      if (completeGoalBar.dataset.motionState === 'complete') {
        completeGoalBar.dataset.motionState = 'ambient'
        attachAmbientController(completeGoalBar, () => startProgressAmbientSweep(completeGoalBar))
      }
    }
    completeGoalText.textContent = `${fmt(soldeFinMois)} / ${fmt(goalTarget)}`
  }

  const completeDebtMonthly = documentRef.getElementById('complete-debt-monthly')
  if (completeDebtMonthly) completeDebtMonthly.textContent = `${fmt(debtSummary.monthly)}/mois`

  const completeDebtTotal = documentRef.getElementById('complete-debt-total')
  if (completeDebtTotal) completeDebtTotal.textContent = fmt(debtSummary.total)

  // Attach global Quick Entry Handlers
  if (typeof window !== 'undefined') {
    window.openQuickBudgetEntry = function() {
      const modal = document.getElementById('quick-entry-modal')
      if (!modal) return
      const revInput = document.getElementById('quick-rev-input')
      const chargesInput = document.getElementById('quick-charges-input')
      const epargneInput = document.getElementById('quick-epargne-input')

      let settings = {}
      try {
        settings = JSON.parse(localStorage.getItem('user_app_settings') || '{}')
      } catch (e) {}

      if (revInput) revInput.value = settings.rev_fixe || ''
      if (chargesInput) chargesInput.value = settings.charges_fixes || ''
      if (epargneInput) epargneInput.value = settings.target_epargne || ''

      modal.classList.add('active')
      modal.setAttribute('aria-hidden', 'false')
    }

    window.closeQuickBudgetEntry = function() {
      const modal = document.getElementById('quick-entry-modal')
      if (!modal) return
      modal.classList.remove('active')
      modal.setAttribute('aria-hidden', 'true')
    }

    window.saveQuickBudgetEntry = function() {
      const revInput = document.getElementById('quick-rev-input')
      const chargesInput = document.getElementById('quick-charges-input')
      const epargneInput = document.getElementById('quick-epargne-input')

      let settings = {}
      try {
        settings = JSON.parse(localStorage.getItem('user_app_settings') || '{}')
      } catch (e) {}

      if (revInput && revInput.value) settings.rev_fixe = String(revInput.value)
      if (chargesInput && chargesInput.value) settings.charges_fixes = String(chargesInput.value)
      if (epargneInput && epargneInput.value) settings.target_epargne = String(epargneInput.value)

      localStorage.setItem('user_app_settings', JSON.stringify(settings))

      if (typeof window.updateAll === 'function') {
        window.updateAll()
      }

      window.closeQuickBudgetEntry()
    }
  }
}

export default renderDashboardQuickView
