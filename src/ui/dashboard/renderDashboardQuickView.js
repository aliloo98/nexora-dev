import { createMetricCard } from '../components/MetricCard.js'
import { evaluateCopilotState } from '../../coach/copilotEngine.js'
import { getTimeContext } from '../../time/timeEngine.js'

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

  // Calculs dérivés
  const totalExpenses = fixReel + varReel
  const savings = revReel - totalExpenses
  const savingsRate = revReel > 0 ? (savings / revReel) * 100 : 0
  const soldeFinMois = savings
  const tauxCharges = revReel > 0 ? Math.round((fixReel / revReel) * 100) : 0
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

  // 3. TIMELINE RUBAN 1-LIGNE TEMPORELLE
  const tLabel1 = documentRef.getElementById('timeline-label-1')
  const tLabel2 = documentRef.getElementById('timeline-label-2')
  const tLabel3 = documentRef.getElementById('timeline-label-3')

  const weekBalanceEl = documentRef.getElementById('week-plan-balance')
  const weekIncomeEl = documentRef.getElementById('week-plan-next-income')
  const weekToPayEl = documentRef.getElementById('week-plan-to-pay')

  if (timeContext.isPast) {
    if (tLabel1) tLabel1.textContent = "Début du mois"
    if (tLabel2) tLabel2.textContent = "Événement majeur"
    if (tLabel3) tLabel3.textContent = "Fin du mois"

    if (weekBalanceEl) weekBalanceEl.textContent = fmt(revReel)
    if (weekIncomeEl) weekIncomeEl.textContent = fixReel > 0 ? `${fmt(fixReel)} payés` : 'Solde neutre'
    if (weekToPayEl) weekToPayEl.textContent = fmt(soldeFinMois)
  } else if (timeContext.isFuture) {
    if (tLabel1) tLabel1.textContent = "Début prévu"
    if (tLabel2) tLabel2.textContent = "Premier revenu"
    if (tLabel3) tLabel3.textContent = "Premières charges"

    if (weekBalanceEl) weekBalanceEl.textContent = "1er du mois"
    if (weekIncomeEl) weekIncomeEl.textContent = revReel > 0 ? fmt(revReel) : 'À définir'
    if (weekToPayEl) weekToPayEl.textContent = fixReel > 0 ? fmt(fixReel) : '0 €'
  } else {
    // CURRENT
    if (tLabel1) tLabel1.textContent = "Aujourd'hui"
    if (tLabel2) tLabel2.textContent = "Prochaine entrée"
    if (tLabel3) tLabel3.textContent = "Charges restantes"

    if (weekBalanceEl) weekBalanceEl.textContent = fmt(soldeFinMois)
    if (weekIncomeEl) weekIncomeEl.textContent = revReel > 0 ? 'Revenu confirmé' : 'À définir'
    if (weekToPayEl) weekToPayEl.textContent = fixReel > 0 ? `${fmt(fixReel)} engagés` : 'Aucune charge'
  }

  // 4. MODE COMPLET - CHARTS SVG DYNAMIQUES (SPRINTS 2 & 3)
  // SPRINT 2: COURBE DE TRÉSORERIE 30 JOURS
  const linePath = documentRef.getElementById('treasury-line-path')
  const areaPath = documentRef.getElementById('treasury-area-path')
  const hoverDot = documentRef.getElementById('treasury-hover-dot')
  if (linePath && areaPath) {
    const yStart = Math.max(20, Math.min(100, 100 - (revReel / Math.max(1, revReel)) * 50))
    const yMid = Math.max(15, Math.min(105, 100 - (copilotState.resteAVivre / Math.max(1, revReel)) * 70))
    const yEnd = Math.max(10, Math.min(110, 100 - (soldeFinMois / Math.max(1, revReel)) * 80))
    
    const lineD = `M 0,${yStart} Q 250,${yMid} 500,${yEnd}`
    const areaD = `M 0,120 L 0,${yStart} Q 250,${yMid} 500,${yEnd} L 500,120 Z`
    
    linePath.setAttribute('d', lineD)
    areaPath.setAttribute('d', areaD)
    if (hoverDot) {
      hoverDot.setAttribute('cx', '250')
      hoverDot.setAttribute('cy', String(yMid))
    }
  }

  // SPRINT 3: DONUT CHART 360°
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

  if (segCharges) {
    segCharges.setAttribute('stroke-dasharray', `${lenCh} ${totalCircumference - lenCh}`)
    segCharges.setAttribute('stroke-dashoffset', '0')
  }
  if (segEpargne) {
    segEpargne.setAttribute('stroke-dasharray', `${lenEp} ${totalCircumference - lenEp}`)
    segEpargne.setAttribute('stroke-dashoffset', String(-lenCh))
  }
  if (segLibre) {
    segLibre.setAttribute('stroke-dasharray', `${lenVar} ${totalCircumference - lenVar}`)
    segLibre.setAttribute('stroke-dashoffset', String(-(lenCh + lenEp)))
  }

  const donutCenterPct = documentRef.getElementById('donut-center-pct')
  if (donutCenterPct) donutCenterPct.textContent = `${pctCh}%`

  const legCh = documentRef.getElementById('donut-leg-charges')
  if (legCh) legCh.textContent = `${pctCh}%`
  const legEp = documentRef.getElementById('donut-leg-epargne')
  if (legEp) legEp.textContent = `${pctEp}%`
  const legVar = documentRef.getElementById('donut-leg-variables')
  if (legVar) legVar.textContent = `${pctVar}%`

  // ANALYSES & DETTES
  const analysisProjVal = documentRef.getElementById('analysis-projection-value')
  if (analysisProjVal) analysisProjVal.textContent = fmt(savings * 12)

  const analysisProjTrend = documentRef.getElementById('analysis-projection-trend')
  if (analysisProjTrend) {
    const annual = savings * 12
    analysisProjTrend.textContent = annual > 0 ? 'Trajectoire positive' : annual < 0 ? 'Trajectoire négative' : 'Trajectoire neutre'
  }

  const analysisTrendVal = documentRef.getElementById('analysis-trend-value')
  if (analysisTrendVal) analysisTrendVal.textContent = fmtPct(savingsRate)

  const analysisRatioVal = documentRef.getElementById('analysis-ratio-value')
  if (analysisRatioVal) analysisRatioVal.textContent = fmt(revReel - fixReel)

  const completeGoalBar = documentRef.getElementById('complete-goal-bar')
  const completeGoalText = documentRef.getElementById('complete-goal-progress-text')
  if (completeGoalBar && completeGoalText) {
    const goalPct = Math.min(100, Math.max(0, savingsRate * 3))
    completeGoalBar.style.width = `${goalPct}%`
    completeGoalText.textContent = `${fmt(soldeFinMois)} / ${fmt(revReel * 0.2)}`
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
