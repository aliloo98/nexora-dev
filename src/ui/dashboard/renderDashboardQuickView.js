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
 * Anime un nombre de façon fluide (GPU/RAF)
 */
function animateValue(element, targetValue, formatter = fmt) {
  if (!element) return
  const target = Number(targetValue) || 0
  const start = Number(element.dataset.numericValue || 0)
  element.dataset.numericValue = target

  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = formatter(target)
    return
  }

  const duration = 350
  const startTime = performance.now()

  function update(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(1, elapsed / duration)
    const easeProgress = 1 - Math.pow(1 - progress, 2)
    const currentValue = start + (target - start) * easeProgress
    element.textContent = formatter(currentValue)
    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      element.textContent = formatter(target)
    }
  }
  requestAnimationFrame(update)
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

  // === CALCUL ÉVALUATION COPILOTE & HERO CONSCIENT DU TEMPS ===
  const copilotState = evaluateCopilotState(metrics, { timeContext })

  // 1. HERO COCKPIT
  const heroMainEl = documentRef.getElementById('hero-main-amount')
  if (heroMainEl) animateValue(heroMainEl, copilotState.resteAVivre)

  const heroStatusEl = documentRef.getElementById('hero-status-phrase')
  if (heroStatusEl) heroStatusEl.textContent = copilotState.heroEmotionalPhrase || copilotState.statusPhrase

  const heroDailyPill = documentRef.getElementById('hero-daily-pill')
  if (heroDailyPill) {
    if (timeContext.isCurrent && copilotState.dailySafeSpend !== null) {
      heroDailyPill.textContent = `💡 ${fmt(copilotState.dailySafeSpend)} / jour`
    } else if (timeContext.isPast) {
      heroDailyPill.textContent = `💡 — € / jour (Mois terminé)`
    } else {
      heroDailyPill.textContent = `💡 — € / jour (Projection)`
    }
  }

  const heroProjPill = documentRef.getElementById('hero-projection-pill')
  if (heroProjPill) {
    const prefix = soldeFinMois >= 0 ? '+' : ''
    heroProjPill.textContent = `📈 Projection : ${prefix}${fmt(soldeFinMois)}`
  }

  const heroSerenityBar = documentRef.getElementById('hero-serenity-bar')
  if (heroSerenityBar) {
    const serenityPct = copilotState.isConfigured ? Math.min(100, Math.max(0, savingsRate > 0 ? Math.min(100, savingsRate * 3) : 10)) : 0
    heroSerenityBar.style.width = `${serenityPct}%`
  }

  const subRevVal = documentRef.getElementById('hero-sub-revenus-val')
  if (subRevVal) subRevVal.textContent = fmt(revReel)

  const subChaVal = documentRef.getElementById('hero-sub-charges-val')
  if (subChaVal) subChaVal.textContent = fmt(fixReel)

  const subDispVal = documentRef.getElementById('hero-sub-disponible-val')
  if (subDispVal) subDispVal.textContent = fmt(copilotState.resteAVivre)

  const subObjVal = documentRef.getElementById('hero-sub-objectif-val')
  if (subObjVal) subObjVal.textContent = fmtPct(savingsRate)

  // 2. COPILOTE CONVERSATIONNEL
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

  // 3. CARTE NARRATIVE "CE QUE J'AI REMARQUÉ"
  if (copilotState.understanding) {
    const headEl = documentRef.getElementById('understanding-headline')
    if (headEl) headEl.textContent = copilotState.understanding.headline

    const detEl = documentRef.getElementById('understanding-details')
    if (detEl) detEl.textContent = copilotState.understanding.details

    const landEl = documentRef.getElementById('understanding-landing')
    if (landEl) landEl.textContent = copilotState.understanding.landingText
  }

  // 4. TIMELINE RUBAN 1-LIGNE TEMPORELLE
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
  if (analysisProjVal) animateValue(analysisProjVal, savings * 12)

  const analysisProjTrend = documentRef.getElementById('analysis-projection-trend')
  if (analysisProjTrend) {
    const annual = savings * 12
    analysisProjTrend.textContent = annual > 0 ? 'Trajectoire positive' : annual < 0 ? 'Trajectoire négative' : 'Trajectoire neutre'
  }

  const analysisTrendVal = documentRef.getElementById('analysis-trend-value')
  if (analysisTrendVal) analysisTrendVal.textContent = fmtPct(savingsRate)

  const analysisRatioVal = documentRef.getElementById('analysis-ratio-value')
  if (analysisRatioVal) animateValue(analysisRatioVal, revReel - fixReel)

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

  // === MODE SIMPLIFIÉ - 8 KPIs COMPACTS ===
  
  const simpleKPIs = [
    { id: 'kpi-simple-1', label: 'Revenus', value: fmt(revReel), context: 'Mois en cours', tone: revReel > 0 ? 'positive' : 'neutral' },
    { id: 'kpi-simple-2', label: 'Charges fixes', value: fmt(fixReel), context: `${tauxCharges}% des revenus`, tone: tauxCharges > 50 ? 'warning' : 'neutral' },
    { id: 'kpi-simple-3', label: 'Dépenses variables', value: fmt(varReel), context: 'Mois en cours', tone: 'neutral' },
    { id: 'kpi-simple-4', label: 'Dettes', value: fmt(debtSummary.total), context: debtSummary.monthly > 0 ? `${fmt(debtSummary.monthly)}/mois` : 'Aucune', tone: debtSummary.total > 0 ? 'warning' : 'neutral' },
    { id: 'kpi-simple-5', label: 'Solde estimé', value: fmt(soldeFinMois), context: soldeFinMois > 0 ? 'Épargne' : soldeFinMois < 0 ? 'Déficit' : 'Équilibre', tone: soldeFinMois > 0 ? 'positive' : soldeFinMois < 0 ? 'critical' : 'neutral' },
    { id: 'kpi-simple-6', label: 'Taux d\'épargne', value: fmtPct(savingsRate), context: savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Correct' : 'Faible', tone: savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'neutral' : 'warning' },
    { id: 'kpi-simple-7', label: 'Dépense/jour', value: fmt(depenseMoyenneJour), context: 'Moyenne estimée', tone: 'neutral' },
    { id: 'kpi-simple-8', label: 'Taux de charges', value: fmtPct(tauxCharges), context: tauxCharges > 50 ? 'Élevé' : 'Normal', tone: tauxCharges > 50 ? 'warning' : 'neutral' }
  ]

  simpleKPIs.forEach(kpi => {
    const root = documentRef.getElementById(kpi.id)
    if (root) {
      root.innerHTML = ''
      root.appendChild(createCompactKPI(kpi, documentRef))
    }
  })

  // === MODE COMPLET - 4 KPIs D'ANALYSE ===
  
  const analysisKPIs = [
    { 
      id: 'kpi-analysis-1', 
      label: 'Projection annuelle', 
      value: fmt(savings * 12), 
      context: 'Épargne annuelle estimée',
      insight: savings > 0 ? `Si vous maintenez ce rythme, vous épargnerez ${fmt(savings * 12)} cette année.` : 'Attention, vous ne constituez pas d\'épargne.',
      icon: '📈',
      tone: savings > 0 ? 'positive' : 'critical'
    },
    { 
      id: 'kpi-analysis-2', 
      label: 'Ratio charges/revenus', 
      value: fmtPct(tauxCharges), 
      context: 'Part des revenus absorbée par les charges fixes',
      insight: tauxCharges > 50 ? 'Vos charges fixes représentent plus de la moitié de vos revenus. Considérez une optimisation.' : 'Vos charges fixes sont dans une zone saine.',
      icon: '📊',
      tone: tauxCharges > 50 ? 'warning' : 'positive'
    },
    { 
      id: 'kpi-analysis-3', 
      label: 'Marge de manœuvre', 
      value: fmt(revReel - fixReel), 
      context: 'Revenus après charges fixes',
      insight: revReel - fixReel > 0 ? `Vous disposez de ${fmt(revReel - fixReel)} pour vos dépenses variables et épargne.` : 'Vos charges fixes dépassent vos revenus.',
      icon: '💡',
      tone: revReel - fixReel > 0 ? 'positive' : 'critical'
    },
    { 
      id: 'kpi-analysis-4', 
      label: 'Taux de consommation', 
      value: fmtPct(100 - savingsRate), 
      context: 'Part des revenus consommée',
      insight: savingsRate >= 20 ? 'Vous maintenez un taux d\'épargne excellent.' : 'Un taux d\'épargne de 20% est recommandé pour une sécurité financière optimale.',
      icon: '🎯',
      tone: savingsRate >= 20 ? 'positive' : 'warning'
    }
  ]

  analysisKPIs.forEach(kpi => {
    const root = documentRef.getElementById(kpi.id)
    if (root) {
      root.innerHTML = ''
      root.appendChild(createAnalysisKPI(kpi, documentRef))
    }
  })

  // Revenus card
  const revenusRoot = documentRef.getElementById('card-revenus')
  if (revenusRoot) {
    const revenusCard = createMetricCard({
      label: 'Revenus',
      value: fmt(revReel),
      context: 'Mois en cours',
      tone: revReel > 0 ? 'positive' : 'neutral'
    }, documentRef)

    revenusRoot.innerHTML = ''
    revenusRoot.appendChild(revenusCard)
  }

  // Charges fixes card
  const fixesRoot = documentRef.getElementById('card-fixes')
  if (fixesRoot) {
    const fixesPct = revReel > 0 ? Math.round(fixReel / revReel * 100) : 0
    let fixesTone = 'neutral'
    if (fixesPct > 60) fixesTone = 'critical'
    else if (fixesPct > 50) fixesTone = 'warning'

    const fixesCard = createMetricCard({
      label: 'Charges fixes',
      value: fmt(fixReel),
      context: revReel > 0 ? `${fixesPct}% des revenus` : 'Ajoutez vos revenus pour commencer',
      tone: fixesTone,
      progress: revReel > 0 ? Math.min(fixesPct, 100) : undefined
    }, documentRef)

    fixesRoot.innerHTML = ''
    fixesRoot.classList.remove('warning-status', 'danger-status')
    if (fixesPct > 60) fixesRoot.classList.add('danger-status')
    else if (fixesPct > 50) fixesRoot.classList.add('warning-status')
    fixesRoot.appendChild(fixesCard)
  }

  // Dépenses variables card
  const variablesRoot = documentRef.getElementById('card-variables')
  if (variablesRoot) {
    const variablesPct = revReel > 0 ? Math.round(varReel / revReel * 100) : 0
    let variablesTone = 'neutral'
    if (variablesPct > 40) variablesTone = 'critical'
    else if (variablesPct > 30) variablesTone = 'warning'

    const variablesCard = createMetricCard({
      label: 'Dépenses variables',
      value: fmt(varReel),
      context: revReel > 0 ? `${variablesPct}% des revenus` : 'Données insuffisantes',
      tone: variablesTone,
      progress: revReel > 0 ? Math.min(variablesPct, 100) : undefined
    }, documentRef)

    variablesRoot.innerHTML = ''
    variablesRoot.classList.remove('warning-status', 'danger-status')
    if (variablesPct > 40) variablesRoot.classList.add('danger-status')
    else if (variablesPct > 30) variablesRoot.classList.add('warning-status')
    variablesRoot.appendChild(variablesCard)
  }

  // Dettes card
  const dettesRoot = documentRef.getElementById('card-dettes')
  if (dettesRoot) {
    const dettesTone = debtSummary.total > 0 ? 'warning' : 'neutral'
    const dettesContext = debtSummary.total > 0 
      ? `Mensualité : ${fmt(debtSummary.monthly)}` 
      : 'Aucune dette active'

    const dettesCard = createMetricCard({
      label: 'Dettes',
      value: fmt(debtSummary.total),
      context: dettesContext,
      tone: dettesTone
    }, documentRef)

    dettesRoot.innerHTML = ''
    dettesRoot.appendChild(dettesCard)
  }

  // === MODE SIMPLIFIÉ (Pilotage quotidien) ===
  
  // Revenus
  const revenusSimpleRoot = documentRef.getElementById('card-revenus-simple')
  if (revenusSimpleRoot) {
    const card = createMetricCard({
      label: 'Revenus',
      value: fmt(revReel),
      context: 'Mois en cours',
      tone: revReel > 0 ? 'positive' : 'neutral'
    }, documentRef)
    revenusSimpleRoot.innerHTML = ''
    revenusSimpleRoot.appendChild(card)
  }

  // Charges fixes
  const fixesSimpleRoot = documentRef.getElementById('card-fixes-simple')
  if (fixesSimpleRoot) {
    const fixesPct = revReel > 0 ? Math.round(fixReel / revReel * 100) : 0
    let fixesTone = 'neutral'
    if (fixesPct > 60) fixesTone = 'critical'
    else if (fixesPct > 50) fixesTone = 'warning'

    const card = createMetricCard({
      label: 'Charges fixes',
      value: fmt(fixReel),
      context: revReel > 0 ? `${fixesPct}% des revenus` : 'Ajoutez vos revenus',
      tone: fixesTone,
      progress: revReel > 0 ? Math.min(fixesPct, 100) : undefined
    }, documentRef)
    fixesSimpleRoot.innerHTML = ''
    fixesSimpleRoot.appendChild(card)
  }

  // Dépenses variables
  const variablesSimpleRoot = documentRef.getElementById('card-variables-simple')
  if (variablesSimpleRoot) {
    const variablesPct = revReel > 0 ? Math.round(varReel / revReel * 100) : 0
    let variablesTone = 'neutral'
    if (variablesPct > 40) variablesTone = 'critical'
    else if (variablesPct > 30) variablesTone = 'warning'

    const card = createMetricCard({
      label: 'Dépenses variables',
      value: fmt(varReel),
      context: revReel > 0 ? `${variablesPct}% des revenus` : 'Données insuffisantes',
      tone: variablesTone,
      progress: revReel > 0 ? Math.min(variablesPct, 100) : undefined
    }, documentRef)
    variablesSimpleRoot.innerHTML = ''
    variablesSimpleRoot.appendChild(card)
  }

  // Dettes
  const dettesSimpleRoot = documentRef.getElementById('card-dettes-simple')
  if (dettesSimpleRoot) {
    const dettesTone = debtSummary.total > 0 ? 'warning' : 'neutral'
    const dettesContext = debtSummary.total > 0 
      ? `Mensualité : ${fmt(debtSummary.monthly)}` 
      : 'Aucune dette active'

    const card = createMetricCard({
      label: 'Dettes',
      value: fmt(debtSummary.total),
      context: dettesContext,
      tone: dettesTone
    }, documentRef)
    dettesSimpleRoot.innerHTML = ''
    dettesSimpleRoot.appendChild(card)
  }

  // Solde estimé en fin de mois (KPI commun)
  const soldeFinMoisRoot = documentRef.getElementById('card-solde-fin-mois')
  if (soldeFinMoisRoot) {
    const soldeTone = soldeFinMois > 0 ? 'positive' : soldeFinMois < 0 ? 'critical' : 'neutral'
    const soldeContext = soldeFinMois > 0 
      ? 'Épargne potentielle' 
      : soldeFinMois < 0 ? 'Déficit prévu' : 'Équilibre'

    const card = createMetricCard({
      label: 'Solde estimé fin de mois',
      value: fmt(soldeFinMois),
      context: soldeContext,
      tone: soldeTone
    }, documentRef)
    soldeFinMoisRoot.innerHTML = ''
    soldeFinMoisRoot.appendChild(card)
  }

  // === MODE COMPLET (Analyse) ===

  // Taux d'épargne
  const tauxEpargneRoot = documentRef.getElementById('card-taux-epargne')
  if (tauxEpargneRoot) {
    let tauxTone = 'neutral'
    if (savingsRate >= 20) tauxTone = 'positive'
    else if (savingsRate >= 10) tauxTone = 'warning'
    else if (savingsRate < 0) tauxTone = 'critical'

    const card = createMetricCard({
      label: 'Taux d\'épargne',
      value: fmtPct(savingsRate),
      context: savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Correct' : savingsRate < 0 ? 'Dépassement' : 'Faible',
      tone: tauxTone,
      progress: revReel > 0 ? Math.min(Math.max(savingsRate, 0), 100) : undefined
    }, documentRef)
    tauxEpargneRoot.innerHTML = ''
    tauxEpargneRoot.appendChild(card)
  }

  // Objectif mensuel atteint
  const objectifAtteintRoot = documentRef.getElementById('card-objectif-atteint')
  if (objectifAtteintRoot) {
    const targetSavings = Number(metrics.targetSavings || 0)
    const objectifPct = targetSavings > 0 ? Math.round((savings / targetSavings) * 100) : 0
    let objectifTone = 'neutral'
    if (objectifPct >= 100) objectifTone = 'positive'
    else if (objectifPct >= 80) objectifTone = 'warning'
    else if (objectifPct < 50 && targetSavings > 0) objectifTone = 'critical'

    const card = createMetricCard({
      label: 'Objectif mensuel',
      value: fmtPct(objectifPct),
      context: targetSavings > 0 ? `Cible : ${fmt(targetSavings)}` : 'Non défini',
      tone: objectifTone,
      progress: targetSavings > 0 ? Math.min(objectifPct, 100) : undefined
    }, documentRef)
    objectifAtteintRoot.innerHTML = ''
    objectifAtteintRoot.appendChild(card)
  }

  // Projection de fin de mois
  const projectionFinRoot = documentRef.getElementById('card-projection-fin')
  if (projectionFinRoot) {
    const projectionTone = soldeFinMois > 0 ? 'positive' : soldeFinMois < 0 ? 'critical' : 'neutral'
    const projectionContext = soldeFinMois > 0 
      ? 'Capacité d\'épargne' 
      : soldeFinMois < 0 ? 'Besoin de financement' : 'Équilibre'

    const card = createMetricCard({
      label: 'Projection fin de mois',
      value: fmt(soldeFinMois),
      context: projectionContext,
      tone: projectionTone
    }, documentRef)
    projectionFinRoot.innerHTML = ''
    projectionFinRoot.appendChild(card)
  }

  // Évolution par rapport au mois précédent
  const evolutionMoisRoot = documentRef.getElementById('card-evolution-mois')
  if (evolutionMoisRoot) {
    const previousSavings = Number(metrics.previousSavings || 0)
    const evolution = savings - previousSavings
    const evolutionPct = previousSavings > 0 ? ((evolution / previousSavings) * 100) : 0
    let evolutionTone = 'neutral'
    if (evolution > 0) evolutionTone = 'positive'
    else if (evolution < 0) evolutionTone = 'critical'

    const card = createMetricCard({
      label: 'Évolution vs mois précédent',
      value: evolution > 0 ? `+${fmt(evolution)}` : fmt(evolution),
      context: previousSavings > 0 ? `${evolutionPct > 0 ? '+' : ''}${fmtPct(evolutionPct)}` : 'Pas de données précédentes',
      tone: evolutionTone
    }, documentRef)
    evolutionMoisRoot.innerHTML = ''
    evolutionMoisRoot.appendChild(card)
  }

  // Dépense moyenne par jour
  const depenseMoyenneJourRoot = documentRef.getElementById('card-depense-moyenne-jour')
  if (depenseMoyenneJourRoot) {
    const daysInMonth = 30
    const avgDailyExpense = totalExpenses / daysInMonth
    let avgTone = 'neutral'
    if (avgDailyExpense > revReel / daysInMonth * 0.8) avgTone = 'critical'
    else if (avgDailyExpense > revReel / daysInMonth * 0.6) avgTone = 'warning'

    const card = createMetricCard({
      label: 'Dépense moyenne / jour',
      value: fmt(avgDailyExpense),
      context: `Total : ${fmt(totalExpenses)}`,
      tone: avgTone
    }, documentRef)
    depenseMoyenneJourRoot.innerHTML = ''
    depenseMoyenneJourRoot.appendChild(card)
  }

  windowRef?.NexoraMotion?.transitionDashboardProgress?.(
    documentRef.querySelector('.dashboard-quick-metrics')
  )
}

export default renderDashboardQuickView
