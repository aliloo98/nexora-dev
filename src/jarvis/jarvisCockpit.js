/**
 * Jarvis Financial Cockpit - Component
 *
 * Point d'entrée principal pour afficher le cockpit Jarvis dans le mode Complet.
 * Consomme le view model Jarvis et génère le markup UI déterministe.
 */

import { buildIntelligenceSnapshot } from '../intelligence/IntelligenceEngine.js'
import { GoalsService } from '../goals/goalsService.js'
import { SettingsService } from '../settings/settingsService.js'

// Dictionnaire déterministe Jarvis
const JARVIS_COPY = {
  // États de santé
  status: {
    unknown: 'Données insuffisantes',
    no_income: 'Revenus manquants',
    critical: 'Situation critique',
    fragile: 'Situation fragile',
    balanced: 'Situation équilibrée',
    stable: 'Situation stable',
    strong: 'Situation solide'
  },

  // Headlines déterministes basées sur l'état
  headline: {
    no_income: 'J\'ai besoin de revenus pour établir une analyse.',
    critical: 'Un déficit est projeté : la priorité est de sécuriser ton cashflow.',
    fragile: 'Tes charges fixes limitent ta marge de manœuvre.',
    balanced: 'Ta situation est équilibrée, mais tu peux optimiser.',
    stable: 'Ta trajectoire reste saine et ton objectif progresse.',
    strong: 'Excellente situation financière avec une marge confortable.',
    insufficient_data: 'J\'ai besoin de davantage de données pour affiner ton analyse.',
    trends_unavailable: 'Pas assez d\'historique pour analyser les tendances.'
  },

  // Labels de priorité
  priority: {
    fix_deficit: 'Réduire le déficit',
    secure_income: 'Sécuriser les revenus',
    capture_opportunity: 'Profiter d\'une marge disponible'
  },

  // Labels de risque
  risk: {
    deficit: 'Déficit mensuel',
    no_income: 'Absence de revenus',
    high_fixed_expenses: 'Charges fixes élevées',
    low_savings_rate: 'Taux d\'épargne faible',
    debt_payment_burden: 'Mensualités importantes'
  },

  // Labels d'opportunité
  opportunity: {
    debt_payoff: 'Rembourser une dette',
    goal_funding: 'Financer un objectif',
    buffer_increase: 'Augmenter la marge de sécurité'
  },

  // Labels de qualité de données
  dataQuality: {
    no_income: 'J\'ai besoin de revenus pour établir une analyse.',
    incomplete: 'J\'ai besoin de davantage de données pour affiner ton analyse.',
    unknown_debts: 'Les données de dettes ne sont pas disponibles.',
    empty_debts: 'Aucune dette connue.'
  }
}

/**
 * Mapping des états de santé J4 vers les états visuels Jarvis
 */
const HEALTH_STATE_TO_VISUAL = {
  critical: 'critical',
  warning: 'fragile',
  stable: 'balanced',
  excellent: 'stable',
  strong: 'strong',
  no_income: 'no_income',
  unknown: 'unknown'
}

/**
 * Crée le view model Jarvis depuis le snapshot J4
 */
export function createJarvisViewModel(snapshot) {
  const { health, priorities, forecast, risks, opportunities, goal, debt, cashflow, dataQuality, evidence } = snapshot

  // Déterminer l'état visuel
  const visualState = HEALTH_STATE_TO_VISUAL[health.status] || 'unknown'

  // Sélectionner la headline appropriée
  let headline = JARVIS_COPY.headline.insufficient_data
  
  // Priorité: no_income > critical > data quality > other
  if (health.status === 'no_income') {
    headline = JARVIS_COPY.headline.no_income
  } else if (health.status === 'critical' && health.cashflow?.monthly < 0) {
    headline = JARVIS_COPY.headline.critical
  } else if (dataQuality.isComplete === false) {
    if (dataQuality.issues?.some(i => i.id === 'no_income')) {
      headline = JARVIS_COPY.headline.no_income
    } else if (dataQuality.issues?.some(i => i.id === 'unknown_debts')) {
      headline = JARVIS_COPY.dataQuality.unknown_debts
    } else {
      headline = JARVIS_COPY.headline.insufficient_data
    }
  } else if (visualState === 'fragile') {
    headline = JARVIS_COPY.headline.fragile
  } else if (visualState === 'balanced') {
    headline = JARVIS_COPY.headline.balanced
  } else if (visualState === 'stable') {
    headline = JARVIS_COPY.headline.stable
  } else if (visualState === 'strong') {
    headline = JARVIS_COPY.headline.strong
  }

  // Sélectionner la priorité principale
  const primaryPriority = priorities?.[0] || null

  // Construire le CTA
  let ctaTarget = 'plan'
  let ctaLabel = 'Voir le plan'
  
  if (primaryPriority) {
    if (primaryPriority.id === 'fix_deficit') {
      ctaTarget = 'saisie'
      ctaLabel = 'Corriger le budget'
    } else if (primaryPriority.id === 'secure_income') {
      ctaTarget = 'saisie'
      ctaLabel = 'Saisir les revenus'
    } else if (primaryPriority.id === 'capture_opportunity') {
      ctaTarget = 'plan'
      ctaLabel = 'Voir le plan'
    }
  }

  // Formater les risques
  const formattedRisks = (risks || []).map(risk => ({
    id: risk.id,
    label: JARVIS_COPY.risk[risk.id] || risk.label || risk.id,
    severity: risk.severity || 'medium'
  }))

  // Formater les opportunités
  const formattedOpportunities = (opportunities || []).map(opp => ({
    id: opp.id,
    label: JARVIS_COPY.opportunity[opp.id] || opp.label || opp.id,
    amount: opp.amount
  }))

  // Formater l'objectif
  const formattedGoal = goal ? {
    id: goal.id,
    target: goal.target,
    current: goal.current,
    progress: goal.progress || 0,
    isPrimary: goal.isPrimary === true,
    targetDate: goal.targetDate
  } : null

  // Formater la dette
  const formattedDebt = debt ? {
    id: debt.id,
    balance: debt.balance,
    monthlyPayment: debt.monthlyPayment,
    ratePct: debt.ratePct
  } : null

  // Formater le cashflow
  const formattedCashflow = cashflow ? {
    income: cashflow.income,
    expenses: cashflow.expenses,
    savings: cashflow.savings,
    savingsRate: cashflow.savingsRate
  } : null

  // Formater la qualité de données
  const formattedDataQuality = {
    isComplete: dataQuality.isComplete === true,
    issues: (dataQuality.issues || []).map(issue => ({
      id: issue.id,
      label: JARVIS_COPY.dataQuality[issue.id] || issue.label || issue.id
    }))
  }

  return {
    visualState,
    statusLabel: JARVIS_COPY.status[visualState] || JARVIS_COPY.status.unknown,
    headline,
    primaryPriority,
    ctaTarget,
    ctaLabel,
    risks: formattedRisks,
    opportunities: formattedOpportunities,
    goal: formattedGoal,
    debt: formattedDebt,
    cashflow: formattedCashflow,
    dataQuality: formattedDataQuality,
    evidence
  }
}

/**
 * Construit l'input pour buildIntelligenceSnapshot depuis l'état Nexora
 */
async function buildJarvisIntelligenceInput(monthKey) {
  try {
    // 1. Collecter les métriques du mois courant
    // Utiliser window.getMonthMetrics si disponible (fonction globale dans index.html)
    // AUDIT: window.getMonthMetrics is the canonical application API defined in index.html
    // It orchestrates budget data reading and cycle balance computation
    // No direct ES module API exists that replaces this without major refactor
    let metrics = {}
    if (typeof window !== 'undefined' && typeof window.getMonthMetrics === 'function') {
      metrics = window.getMonthMetrics(monthKey, { fromDom: true }) || {}
    }

    // 2. Collecter l'historique (2 mois minimum pour trends)
    // Note: L'historique n'est pas encore implémenté comme service séparé
    // On utilise un tableau vide pour l'instant
    const history = []

    // 3. Collecter les objectifs
    const goals = await GoalsService.getGoals().catch(() => [])

    // 4. Collecter les dettes
    // Note: Utiliser window.readDebts si disponible, sinon tableau vide
    let debts = []
    if (typeof window !== 'undefined' && typeof window.readDebts === 'function') {
      debts = await window.readDebts().catch(() => [])
    }

    // 5. Collecter les échéanciers de factures
    const billSchedules = await SettingsService.getBillSchedules().catch(() => [])

    // 6. Déterminer la disponibilité des données
    const dataAvailability = {
      goals: 'known',
      debts: 'known'
    }

    return {
      metrics: normalizeMetrics(metrics),
      history: normalizeHistory(history),
      goals: normalizeGoals(goals),
      debts: normalizeDebts(debts),
      billSchedules: normalizeBillSchedules(billSchedules),
      dataAvailability
    }
  } catch (error) {
    console.warn('[Jarvis Data Adapter] Error building intelligence input:', error)
    // Fallback avec données vides pour éviter le crash
    return {
      metrics: {},
      history: [],
      goals: [],
      debts: [],
      billSchedules: [],
      dataAvailability: {}
    }
  }
}

/**
 * Normalise les métriques pour le contrat J4
 * window.getMonthMetrics returns: { income, fixed, variable, expenses, paidExpenses, savings, savingsRate, ... }
 * J4 expects: { income, fixedExpenses, variableExpenses, plannedExpenses, paidExpenses, savingsRate }
 */
function normalizeMetrics(metrics) {
  return {
    income: metrics.income || 0,
    fixedExpenses: metrics.fixed || 0,
    variableExpenses: metrics.variable || 0,
    plannedExpenses: metrics.expenses || 0,
    paidExpenses: metrics.paidExpenses || 0,
    savingsRate: metrics.savingsRate || 0
  }
}

/**
 * Normalise l'historique pour le contrat J4
 * Contract: [{ income, expenses }]
 */
function normalizeHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .slice(0, 6) // Garder max 6 mois
    .map(month => ({
      income: month.income || 0,
      expenses: month.expenses || 0
    }))
    .filter(h => h.income > 0 || h.expenses > 0) // Filtrer les mois vides
}

/**
 * Normalise les objectifs pour le contrat J4
 */
function normalizeGoals(goals) {
  if (!Array.isArray(goals)) return []

  return goals
    .filter(g => g && (g.target || g.targetAmount))
    .map(g => ({
      id: g.id,
      target: g.target || g.targetAmount,
      current: g.current || g.amount || 0,
      isPrimary: g.isPrimary === true,
      targetDate: g.targetDate || null
    }))
}

/**
 * Normalise les dettes pour le contrat J4
 */
function normalizeDebts(debts) {
  if (!Array.isArray(debts)) return []

  return debts
    .filter(d => d && (d.balance || d.amount))
    .map(d => ({
      id: d.id,
      balance: d.balance || d.amount,
      ratePct: d.ratePct || d.rate || 0,
      minPayment: d.minPayment || 0
    }))
}

/**
 * Normalise les échéanciers pour le contrat J4
 */
function normalizeBillSchedules(billSchedules) {
  if (!Array.isArray(billSchedules)) return []

  return billSchedules
    .filter(b => b && b.amount)
    .map(b => ({
      id: b.id,
      amount: b.amount,
      dayOfMonth: b.dayOfMonth,
      recurrence: b.recurrence || 'monthly'
    }))
}

/**
 * Détermine si Jarvis doit être affiché (mode Complet uniquement)
 */
function shouldShowJarvis() {
  if (typeof document === 'undefined') return false
  return document.body.classList.contains('mode-complete')
}

/**
 * Point d'entrée principal pour l'intégration Jarvis dans le Dashboard
 * Remplace le contenu de cockpit-financier-root par Jarvis en mode Complet
 */
export async function renderJarvisInDashboard(options = {}) {
  const { monthKey, documentRef = document, windowRef = window } = options
  const cockpitRoot = documentRef.getElementById('cockpit-financier-root')

  if (!cockpitRoot) {
    console.warn('[Jarvis Integration] cockpit-financier-root not found')
    return
  }

  // Jarvis ne s'affiche qu'en mode Complet
  if (!shouldShowJarvis()) {
    console.log('[Jarvis Integration] Simplified mode - skipping Jarvis')
    // En mode Simplifié, on laisse le système existant gérer le cockpit
    return
  }

  console.log('[Jarvis Integration] Complete mode detected - rendering Jarvis')

  try {
    // Afficher le cockpit Jarvis
    await renderJarvisCockpit(cockpitRoot, {
      monthKey,
      documentRef,
      windowRef
    })

    console.log('[Jarvis Integration] Jarvis cockpit rendered in Complete mode')
  } catch (error) {
    console.error('[Jarvis Integration] Error rendering Jarvis:', error)
    // En cas d'erreur, ne pas casser le dashboard - laisser le fallback
  }
}

/**
 * Met à jour Jarvis lors du changement de mode
 */
export async function updateJarvisOnModeChange() {
  const cockpitRoot = document.getElementById('cockpit-financier-root')
  if (!cockpitRoot) return

  if (shouldShowJarvis()) {
    // Passage en mode Complet : afficher Jarvis
    const monthKey = typeof window.getMonth === 'function' ? window.getMonth() : null
    await renderJarvisCockpit(cockpitRoot, { monthKey })
  } else {
    // Passage en mode Simplifié : retirer Jarvis
    // Le système existant reprendra le contrôle
    cockpitRoot.innerHTML = ''
  }
}

/**
 * Met à jour Jarvis lors du rafraîchissement des données
 */
export async function refreshJarvisData(monthKey) {
  if (!shouldShowJarvis()) return

  const cockpitRoot = document.getElementById('cockpit-financier-root')
  if (!cockpitRoot) return

  try {
    await updateJarvisCockpit(cockpitRoot, { monthKey })
  } catch (error) {
    console.error('[Jarvis Integration] Error refreshing Jarvis:', error)
  }
}

/**
 * Initialise les listeners pour l'intégration Jarvis
 */
export function initJarvisDashboardIntegration(windowRef = window) {
  console.log('[Jarvis Integration] Initializing Dashboard integration')
  
  // Observer les changements de classe sur body (mode switch)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target
          if (target.classList.contains('mode-simple') || target.classList.contains('mode-complete')) {
            // Délai pour laisser le CSS s'appliquer
            setTimeout(() => updateJarvisOnModeChange(), 50)
          }
        }
      }
    })

    const body = windowRef.document?.body
    if (body) {
      observer.observe(body, { attributes: true, attributeFilter: ['class'] })
    }
  }

  // Initial render if already in Complete mode
  if (shouldShowJarvis()) {
    console.log('[Jarvis Integration] Already in Complete mode - triggering initial render')
    // Use a longer delay to ensure the app is fully initialized
    setTimeout(() => {
      const monthKey = typeof windowRef.getMonth === 'function' ? windowRef.getMonth() : null
      renderJarvisInDashboard({ monthKey, documentRef: windowRef.document, windowRef })
    }, 1000)
  }

  console.log('[Jarvis Integration] Dashboard integration initialized')
}

/**
 * Formate un montant monétaire
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 €'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Formate un pourcentage
 */
function formatPercent(value) {
  if (typeof value !== 'number' || isNaN(value)) return '0%'
  return `${Math.round(value)}%`
}

/**
 * Échappe le HTML pour la sécurité
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Génère le markup du Hero Jarvis
 */
function renderJarvisHero(viewModel) {
  const { visualState, statusLabel, headline } = viewModel

  return `
    <div class="jarvis-hero" data-state="${visualState}">
      <div class="jarvis-status-badge">${escapeHtml(statusLabel)}</div>
      <h2 class="jarvis-headline">${escapeHtml(headline)}</h2>
      <div class="jarvis-visual-anchor" aria-hidden="true"></div>
    </div>
  `
}

/**
 * Génère le markup de la carte Priorité
 */
function renderPriorityCard(viewModel) {
  const { priority, priorityCta } = viewModel

  if (!priority) {
    return `
      <div class="jarvis-priority-card">
        <div class="jarvis-priority-header">
          <span class="jarvis-priority-label">Priorité</span>
        </div>
        <p class="jarvis-priority-action">Aucune priorité détectée</p>
      </div>
    `
  }

  const ctaMarkup = priorityCta 
    ? `<a href="#" class="jarvis-priority-cta" data-target="${priorityCta.target}" role="button">${escapeHtml(priorityCta.label)}</a>`
    : ''

  return `
    <div class="jarvis-priority-card">
      <div class="jarvis-priority-header">
        <span class="jarvis-priority-label">Priorité</span>
        <span class="jarvis-priority-label" style="color: var(--jarvis-accent);">#${priority.rank}</span>
      </div>
      <p class="jarvis-priority-action">${escapeHtml(priority.label)}</p>
      ${ctaMarkup}
    </div>
  `
}

/**
 * Génère le markup du panel Trajectoire
 */
function renderTrajectoryPanel(viewModel) {
  const { trajectory, cashflow } = viewModel

  const finalBalance = trajectory.finalBalance || 0
  const lowestBalance = trajectory.lowestBalance || 0
  const isPositive = trajectory.cashflowPositive

  return `
    <div class="jarvis-trajectory-panel">
      <div class="jarvis-metric-card">
        <span class="jarvis-metric-label">Solde projeté fin de mois</span>
        <span class="jarvis-metric-value" data-positive="${isPositive}">${formatCurrency(finalBalance)}</span>
      </div>
      <div class="jarvis-metric-card">
        <span class="jarvis-metric-label">Point le plus bas</span>
        <span class="jarvis-metric-value" data-positive="${lowestBalance >= 0}">${formatCurrency(lowestBalance)}</span>
      </div>
      ${trajectory.trendsAvailable ? `
        <div class="jarvis-metric-card">
          <span class="jarvis-metric-label">Tendance revenus</span>
          <div class="jarvis-trend-indicator" data-trend="${trajectory.incomeTrend}">
            ${trajectory.incomeTrend === 'up' ? '↗' : trajectory.incomeTrend === 'down' ? '↘' : '→'}
            <span>${trajectory.incomeTrend === 'up' ? 'Hausse' : trajectory.incomeTrend === 'down' ? 'Baisse' : 'Stable'}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `
}

/**
 * Génère le markup des Signaux (Risques/Opportunités)
 */
function renderSignalsSection(viewModel) {
  const { risks, opportunities } = viewModel

  if (risks.length === 0 && opportunities.length === 0) {
    return ''
  }

  const risksMarkup = risks.slice(0, 2).map(risk => `
    <div class="jarvis-signal-card" data-severity="${risk.severity}" data-type="risk">
      <div class="jarvis-signal-indicator"></div>
      <div class="jarvis-signal-content">
        <div class="jarvis-signal-title">${escapeHtml(risk.label)}</div>
        <div class="jarvis-signal-description">${escapeHtml(risk.severityLabel)} · ${escapeHtml(risk.domain)}</div>
      </div>
    </div>
  `).join('')

  const opportunitiesMarkup = opportunities.slice(0, 2).map(opp => `
    <div class="jarvis-signal-card" data-type="opportunity">
      <div class="jarvis-signal-indicator"></div>
      <div class="jarvis-signal-content">
        <div class="jarvis-signal-title">${escapeHtml(opp.title)}</div>
        <div class="jarvis-signal-description">${escapeHtml(opp.description || '')}</div>
      </div>
    </div>
  `).join('')

  return `
    <div class="jarvis-signals-section">
      <div class="jarvis-signals-header">Signaux détectés</div>
      <div class="jarvis-signals-grid">
        ${risksMarkup}
        ${opportunitiesMarkup}
      </div>
    </div>
  `
}

/**
 * Génère le markup du module Objectif
 */
function renderGoalModule(viewModel) {
  const { goal } = viewModel

  if (!goal) {
    return ''
  }

  return `
    <div class="jarvis-goal-module">
      <div class="jarvis-goal-header">
        <span class="jarvis-goal-title">Objectif principal</span>
        <span class="jarvis-goal-stat-value">${formatPercent(goal.progress)}</span>
      </div>
      <div class="jarvis-goal-progress">
        <div class="jarvis-goal-progress-bar" style="width: ${goal.progress}%"></div>
      </div>
      <div class="jarvis-goal-stats">
        <span class="jarvis-goal-stat">Restant: <span class="jarvis-goal-stat-value">${formatCurrency(goal.remaining)}</span></span>
        <span class="jarvis-goal-stat">Rythme: <span class="jarvis-goal-stat-value">${escapeHtml(goal.pace || 'Normal')}</span></span>
      </div>
    </div>
  `
}

/**
 * Génère le markup du mode Qualité de Données
 */
function renderDataQualityMode(viewModel) {
  const { dataQuality } = viewModel

  if (dataQuality.isComplete) {
    return ''
  }

  const issuesMarkup = dataQuality.issues.map(issue => `
    <div class="jarvis-data-quality-issue">
      ${escapeHtml(issue.label)}
    </div>
  `).join('')

  return `
    <div class="jarvis-data-quality-mode" data-dashboard-mode="complete">
      <p class="jarvis-data-quality-message">${escapeHtml(viewModel.headline)}</p>
      <div class="jarvis-data-quality-issues">
        ${issuesMarkup}
      </div>
    </div>
  `
}

/**
 * Point d'entrée principal - Génère le cockpit Jarvis complet
 */
export async function renderJarvisCockpit(container, options = {}) {
  const { monthKey, documentRef = document, windowRef = window } = options

  if (!container) {
    console.warn('[Jarvis Cockpit] No container provided')
    return
  }

  try {
    console.log('[Jarvis Cockpit] Starting render with monthKey:', monthKey)

    // 1. Construire l'input J4 depuis l'état Nexora
    const intelligenceInput = await buildJarvisIntelligenceInput(monthKey)
    console.log('[Jarvis Cockpit] Intelligence input built:', intelligenceInput)

    // 2. Générer le snapshot J4
    const snapshot = buildIntelligenceSnapshot(intelligenceInput, {
      referenceDate: new Date()
    })
    console.log('[Jarvis Cockpit] Snapshot generated:', snapshot)

    // 3. Créer le view model Jarvis
    const viewModel = createJarvisViewModel(snapshot)
    console.log('[Jarvis Cockpit] View model created:', viewModel)
    console.log('[Jarvis Cockpit] Data quality complete:', viewModel.dataQuality.isComplete)

    // 4. Si données insuffisantes, afficher le mode qualité de données
    if (!viewModel.dataQuality.isComplete) {
      console.log('[Jarvis Cockpit] Rendering data quality mode')
      const dataQualityMarkup = `
        <div class="jarvis-cockpit" data-dashboard-mode="complete" data-motion="entry">
          ${renderDataQualityMode(viewModel)}
        </div>
      `
      container.innerHTML = dataQualityMarkup
      console.log('[Jarvis Cockpit] Data quality mode rendered')
      return
    }

    // 5. Générer le markup complet du cockpit
    const cockpitMarkup = `
      <div class="jarvis-cockpit" data-dashboard-mode="complete" data-motion="entry">
        ${renderJarvisHero(viewModel)}
        ${renderPriorityCard(viewModel)}
        ${renderTrajectoryPanel(viewModel)}
        ${renderSignalsSection(viewModel)}
        ${renderGoalModule(viewModel)}
      </div>
    `

    console.log('[Jarvis Cockpit] Cockpit markup length:', cockpitMarkup.length)
    container.innerHTML = cockpitMarkup
    console.log('[Jarvis Cockpit] Container innerHTML set, has jarvis-cockpit:', container.querySelector('.jarvis-cockpit') !== null)

    // 6. Attacher les événements CTA
    attachCtaListeners(container, windowRef)

    // 7. Déclencher l'animation d'entrée
    requestAnimationFrame(() => {
      const cockpit = container.querySelector('.jarvis-cockpit')
      if (cockpit) {
        cockpit.dataset.motion = 'entry'
      }
    })

  } catch (error) {
    console.error('[Jarvis Cockpit] Error rendering cockpit:', error)
    container.innerHTML = `
      <div class="jarvis-cockpit">
        <div class="jarvis-data-quality-mode">
          <p class="jarvis-data-quality-message">Impossible d'afficher l'analyse pour le moment.</p>
        </div>
      </div>
    `
  }
}

/**
 * Attache les listeners pour les CTA
 */
function attachCtaListeners(container, windowRef) {
  const ctaButtons = container.querySelectorAll('.jarvis-priority-cta')
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault()
      const target = button.dataset.target
      
      if (target && typeof windowRef.showSection === 'function') {
        windowRef.showSection(target)
      }
    })
  })
}

/**
 * Met à jour le cockpit Jarvis existant
 */
export async function updateJarvisCockpit(container, options = {}) {
  if (!container) return
  
  // Réutiliser la logique de render principal
  await renderJarvisCockpit(container, options)
}

export default {
  renderJarvisCockpit,
  updateJarvisCockpit,
  renderJarvisInDashboard,
  updateJarvisOnModeChange,
  refreshJarvisData,
  initJarvisDashboardIntegration,
  createJarvisViewModel
}