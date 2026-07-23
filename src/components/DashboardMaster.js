import { getProactiveCoach } from '../advisor/proactiveCoachService.js'
import TreasuryAdapter from '../treasury/treasuryAdapter.js'
import { buildJudgmentEngine } from '../assistant/judgmentEngine.js'

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

export async function renderDashboardMaster(rootId, TreasuryService) {
  const root = document.getElementById(rootId)
  if (!root) return
  root.classList.add('dashboard-coach-root', 'fade-in')
  // gather minimal inputs from global services if available
  const monthKey = typeof window.getMonth === 'function' ? window.getMonth() : new Date().toISOString().slice(0, 7)
  let revenues = []
  let charges = []
  try {
    const flows = await TreasuryAdapter.fetchCurrentMonthBudget(monthKey)
    revenues = Array.isArray(flows?.revenues) ? flows.revenues : []
    charges = Array.isArray(flows?.charges) ? flows.charges : []
  } catch (error) {
    console.warn('[DashboardMaster] treasury flows unavailable, using empty fallback', error)
  }
  const coach = await getProactiveCoach().catch(() => null)
  const judgment = buildJudgmentEngine({
    income: coach?.summary?.income ?? 0,
    fixedExpenses: coach?.summary?.fixedExpenses ?? 0,
    variableExpenses: coach?.summary?.variableExpenses ?? 0,
    expenses: coach?.summary?.expenses ?? 0,
    projectedBalance: coach?.summary?.projectedBalance ?? 0,
    currentBalance: coach?.summary?.currentBalance ?? 0,
    debts: [],
    goals: [],
    primaryGoal: null,
    settings: coach?.settings
  })
  const hasBudgetData = revenues.length > 0 || charges.length > 0
  const coachPriority = coach?.priority || (hasBudgetData ? 'Compléter le budget' : 'Commencer le budget')
  const actionLabel = hasBudgetData ? (coach?.actionLabel || 'Voir la priorité') : 'Saisir le mois'
  const actionTarget = hasBudgetData ? (coach?.actionTarget || 'saisie') : 'saisie'
  const reasons = [
    {
      tone: 'danger',
      icon: '!',
      title: 'Situation actuelle',
      detail: judgment.diagnostic
    },
    {
      tone: 'warning',
      icon: '↗',
      title: 'Impact financier',
      detail: judgment.impact
    },
    {
      tone: 'positive',
      icon: '✓',
      title: 'Action recommandée',
      detail: judgment.action
    }
  ]

  const markup = `
    <div class="dashboard-coach-content">
      <div class="dashboard-coach-heading">
        <div>
          <span>Pourquoi c’est ma priorité ?</span>
          <strong>${escapeHtml(coachPriority)}</strong>
        </div>
        <em>${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</em>
      </div>
      <div class="dashboard-reasons" role="list">
        ${reasons.map((reason) => `
          <div class="dashboard-reason dashboard-reason--${reason.tone}" role="listitem">
            <i aria-hidden="true">${reason.icon}</i>
            <div>
              <strong>${escapeHtml(reason.title)}</strong>
              <p>${escapeHtml(reason.detail)}</p>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="dashboard-coach-footer">
        <span>${escapeHtml(judgment.why)}</span>
        ${hasBudgetData
          ? `<button class="btn btn-outline" type="button" id="dashboard-coach-action">${escapeHtml(actionLabel)} <span aria-hidden="true">→</span></button>`
          : `<button class="btn btn-outline" type="button" id="dashboard-empty-action">Comprendre mes recommandations <span aria-hidden="true">→</span></button>`}
      </div>
    </div>
  `

  if (root.__dashboardCoachMarkup !== markup || !root.querySelector('.dashboard-coach-content')) {
    root.innerHTML = markup
    root.__dashboardCoachMarkup = markup
  }

  const coachAction = root.querySelector('#dashboard-coach-action')
  if (coachAction) coachAction.onclick = () => window.showSection?.(actionTarget)
  const emptyAction = root.querySelector('#dashboard-empty-action')
  if (emptyAction) emptyAction.onclick = () => window.showSection?.('saisie')
  window.NexoraMotion?.animateCards?.(root)
}
