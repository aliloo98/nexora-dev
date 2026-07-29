/**
 * AssistantUI - Simple UI for rendering Assistant Nexora results
 * 
 * This UI is decoupled from the Dashboard and can be rendered in any container.
 * It provides basic rendering functions for the AssistantReport.
 */

class AssistantUI {
  /**
   * Render the complete assistant report
   * @param {HTMLElement} container - Container element
   * @param {AssistantReport} report - Assistant report
   */
  static render(container, report) {
    if (!container || !report) return

    container.innerHTML = ''
    container.className = 'nx-assistant'

    // Render header with score
    const header = this.renderHeader(report)
    container.appendChild(header)

    // Render judgment
    const judgment = this.renderJudgment(report)
    container.appendChild(judgment)

    // Render alerts if any
    if (report.alerts.length > 0 && report.alerts[0].id !== 'none') {
      const alerts = this.renderAlerts(report)
      container.appendChild(alerts)
    }

    // Render recommendations
    const recommendations = this.renderRecommendations(report)
    container.appendChild(recommendations)

    // Render insights
    const insights = this.renderInsights(report)
    container.appendChild(insights)
  }

  /**
   * Render header with score
   * @param {AssistantReport} report - Assistant report
   * @returns {HTMLElement}
   */
  static renderHeader(report) {
    const header = document.createElement('div')
    header.className = 'nx-assistant-header'

    const scoreContainer = document.createElement('div')
    scoreContainer.className = 'nx-assistant-score'

    const scoreValue = document.createElement('div')
    scoreValue.className = 'nx-assistant-score-value'
    scoreValue.textContent = report.score

    const scoreLabel = document.createElement('div')
    scoreLabel.className = 'nx-assistant-score-label'
    scoreLabel.textContent = report.scoreLabel

    scoreContainer.appendChild(scoreValue)
    scoreContainer.appendChild(scoreLabel)

    const trajectory = document.createElement('div')
    trajectory.className = 'nx-assistant-trajectory'
    trajectory.textContent = report.trajectoryLabel

    header.appendChild(scoreContainer)
    header.appendChild(trajectory)

    return header
  }

  /**
   * Render judgment section
   * @param {AssistantReport} report - Assistant report
   * @returns {HTMLElement}
   */
  static renderJudgment(report) {
    const judgment = report.judgment
    if (!judgment) return document.createElement('div')

    const section = document.createElement('div')
    section.className = 'nx-assistant-judgment'

    const diagnostic = document.createElement('div')
    diagnostic.className = 'nx-assistant-diagnostic'
    diagnostic.textContent = judgment.diagnostic

    const action = document.createElement('div')
    action.className = 'nx-assistant-action'
    action.textContent = judgment.action

    section.appendChild(diagnostic)
    section.appendChild(action)

    return section
  }

  /**
   * Render alerts section
   * @param {AssistantReport} report - Assistant report
   * @returns {HTMLElement}
   */
  static renderAlerts(report) {
    const section = document.createElement('div')
    section.className = 'nx-assistant-alerts'

    const title = document.createElement('div')
    title.className = 'nx-assistant-section-title'
    title.textContent = 'Points de vigilance'
    section.appendChild(title)

    const list = document.createElement('ul')
    list.className = 'nx-assistant-alerts-list'

    report.alerts.forEach(alert => {
      if (alert.id === 'none') return
      const item = document.createElement('li')
      item.className = 'nx-assistant-alert-item'
      item.textContent = alert.label
      list.appendChild(item)
    })

    section.appendChild(list)
    return section
  }

  /**
   * Render recommendations section
   * @param {AssistantReport} report - Assistant report
   * @returns {HTMLElement}
   */
  static renderRecommendations(report) {
    const section = document.createElement('div')
    section.className = 'nx-assistant-recommendations'

    const title = document.createElement('div')
    title.className = 'nx-assistant-section-title'
    title.textContent = 'Recommandations'
    section.appendChild(title)

    const list = document.createElement('ul')
    list.className = 'nx-assistant-recommendations-list'

    report.recommendations.forEach(rec => {
      const item = document.createElement('li')
      item.className = 'nx-assistant-recommendation-item'
      item.textContent = rec
      list.appendChild(item)
    })

    section.appendChild(list)
    return section
  }

  /**
   * Render insights section
   * @param {AssistantReport} report - Assistant report
   * @returns {HTMLElement}
   */
  static renderInsights(report) {
    const section = document.createElement('div')
    section.className = 'nx-assistant-insights'

    const title = document.createElement('div')
    title.className = 'nx-assistant-section-title'
    title.textContent = 'Analyse'
    section.appendChild(title)

    const list = document.createElement('ul')
    list.className = 'nx-assistant-insights-list'

    report.insights.forEach(insight => {
      const item = document.createElement('li')
      item.className = 'nx-assistant-insight-item'
      item.textContent = insight
      list.appendChild(item)
    })

    section.appendChild(list)
    return section
  }

  /**
   * Render quick insights (for dashboard widgets)
   * @param {HTMLElement} container - Container element
   * @param {Object} quickInsights - Quick insights from service
   */
  static renderQuickInsights(container, quickInsights) {
    if (!container || !quickInsights) return

    container.innerHTML = ''
    container.className = 'nx-assistant-quick'

    const score = document.createElement('div')
    score.className = 'nx-assistant-quick-score'
    score.textContent = `${quickInsights.score}/100`

    const label = document.createElement('div')
    label.className = 'nx-assistant-quick-label'
    label.textContent = quickInsights.scoreLabel

    const trajectory = document.createElement('div')
    trajectory.className = 'nx-assistant-quick-trajectory'
    trajectory.textContent = quickInsights.trajectoryLabel

    container.appendChild(score)
    container.appendChild(label)
    container.appendChild(trajectory)

    if (quickInsights.topAlert && quickInsights.topAlert.id !== 'none') {
      const alert = document.createElement('div')
      alert.className = 'nx-assistant-quick-alert'
      alert.textContent = quickInsights.topAlert.label
      container.appendChild(alert)
    }

    if (quickInsights.topRecommendation) {
      const rec = document.createElement('div')
      rec.className = 'nx-assistant-quick-rec'
      rec.textContent = quickInsights.topRecommendation
      container.appendChild(rec)
    }
  }

  /**
   * Render judgment only
   * @param {HTMLElement} container - Container element
   * @param {Object} judgment - Judgment object
   */
  static renderJudgmentOnly(container, judgment) {
    if (!container || !judgment) return

    container.innerHTML = ''
    container.className = 'nx-assistant-judgment-only'

    const diagnostic = document.createElement('div')
    diagnostic.className = 'nx-assistant-diagnostic'
    diagnostic.textContent = judgment.diagnostic

    const action = document.createElement('div')
    action.className = 'nx-assistant-action'
    action.textContent = judgment.action

    const why = document.createElement('div')
    why.className = 'nx-assistant-why'
    why.textContent = judgment.why

    container.appendChild(diagnostic)
    container.appendChild(action)
    container.appendChild(why)
  }

  /**
   * Clear the container
   * @param {HTMLElement} container - Container element
   */
  static clear(container) {
    if (container) {
      container.innerHTML = ''
    }
  }
}

export { AssistantUI }
export default AssistantUI
