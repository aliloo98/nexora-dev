import { getRealAssistantService, areRealServicesAvailable } from '../../assistant/assistantFactory.js'
import { createBadge } from '../primitives/Badge.js'
import { setText } from '../internal/dom.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

/**
 * Renders the Assistant Insights Card using the new Assistant Nexora V1.
 * @param {Object} options - Additional options (documentRef, monthKey)
 */
export async function renderAssistantInsights(options = {}) {
  const documentRef = options.documentRef || document
  const monthKey = options.monthKey || new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  const root = documentRef.getElementById('assistant-insights-card')
  if (!root) {
    console.warn('[renderAssistantInsights] Container #assistant-insights-card not found')
    return
  }

  // Check if real services are available
  if (!areRealServicesAvailable()) {
    root.innerHTML = `
      <div class="nx-assistant-card__placeholder">
        <span class="nx-assistant-card__icon">🤖</span>
        <strong>Assistant Nexora</strong>
        <span>En attente des données...</span>
      </div>
    `
    return
  }

  try {
    const service = getRealAssistantService()
    // Convert YYYY-MM format to French month label if needed
    const displayMonthKey = monthKey.match(/^\d{4}-\d{2}$/)
      ? (() => {
          const [year, monthIndex] = monthKey.split('-').map(Number)
          return new Date(year, monthIndex - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
        })()
      : monthKey
    const insights = await service.getQuickInsights(displayMonthKey)

    // Create card structure
    root.innerHTML = ''

    const header = documentRef.createElement('div')
    header.className = 'nx-assistant-card__header'
    
    const headerContent = documentRef.createElement('div')
    const eyebrow = documentRef.createElement('span')
    eyebrow.className = 'nx-assistant-card__eyebrow'
    setText(eyebrow, 'Assistant')
    const title = documentRef.createElement('strong')
    setText(title, 'Nexora')
    headerContent.appendChild(eyebrow)
    headerContent.appendChild(title)
    header.appendChild(headerContent)

    // Score badge
    const scoreBadge = createBadge({
      label: String(insights.score),
      tone: insights.status === 'critical' ? 'danger' : insights.status === 'attention' ? 'warning' : insights.status === 'excellent' ? 'success' : 'neutral'
    }, documentRef)
    scoreBadge.className = 'nx-assistant-card__score'
    header.appendChild(scoreBadge)

    root.appendChild(header)

    // Judgment
    if (insights.topAlert) {
      const judgment = documentRef.createElement('div')
      judgment.className = 'nx-assistant-card__judgment'
      
      const judgmentIcon = documentRef.createElement('i')
      judgmentIcon.setAttribute('aria-hidden', 'true')
      judgmentIcon.className = `nx-assistant-card__judgment-icon nx-assistant-card__judgment-icon--${insights.status}`
      
      const judgmentContent = documentRef.createElement('div')
      const judgmentTitle = documentRef.createElement('strong')
      setText(judgmentTitle, insights.topAlert.label || 'Analyse en cours')
      const judgmentDetail = documentRef.createElement('span')
      setText(judgmentDetail, insights.trajectoryLabel || '')
      judgmentContent.appendChild(judgmentTitle)
      judgmentContent.appendChild(judgmentDetail)
      
      judgment.appendChild(judgmentIcon)
      judgment.appendChild(judgmentContent)
      root.appendChild(judgment)
    }

    // Top recommendation
    if (insights.topRecommendation) {
      const recommendation = documentRef.createElement('div')
      recommendation.className = 'nx-assistant-card__recommendation'
      
      const recIcon = documentRef.createElement('i')
      recIcon.setAttribute('aria-hidden', 'true')
      
      const recContent = documentRef.createElement('div')
      const recLabel = documentRef.createElement('span')
      recLabel.className = 'nx-assistant-card__rec-label'
      setText(recLabel, 'Conseil')
      const recText = documentRef.createElement('span')
      setText(recText, insights.topRecommendation)
      recContent.appendChild(recLabel)
      recContent.appendChild(recText)
      
      recommendation.appendChild(recIcon)
      recommendation.appendChild(recContent)
      root.appendChild(recommendation)
    }

  } catch (error) {
    console.error('[renderAssistantInsights] Error:', error)
    root.innerHTML = `
      <div class="nx-assistant-card__error">
        <span class="nx-assistant-card__icon">⚠️</span>
        <strong>Assistant indisponible</strong>
        <span>Réessayez plus tard</span>
      </div>
    `
  }
}

export default renderAssistantInsights
