import DashboardService from '../dashboard/dashboardService.js'
import { getProactiveCoach } from '../advisor/proactiveCoachService.js'

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
  const baseBalance = (window?.MonthlyBudgetStateService?.getCurrentBalanceSync && typeof window.MonthlyBudgetStateService.getCurrentBalanceSync === 'function') ? window.MonthlyBudgetStateService.getCurrentBalanceSync() : 0
  const revenues = []
  const charges = []
  const plan = DashboardService.get7DayPlan({ fromDate: new Date(), baseBalance, revenues, charges })
  const action = DashboardService.getActionOfDay(plan)
  const coach = await getProactiveCoach().catch(() => null)
  const simpleMode = document.body?.classList?.contains('mode-simple')
  const showDetails = coach && !simpleMode
  const coachAdvice = coach?.dailyAdvice || 'Complète ton budget pour recevoir un conseil fiable.'
  const coachPriority = coach?.priority || 'Mettre à jour le budget'
  const actionLabel = coach?.actionLabel || 'Mettre à jour'
  const actionTarget = coach?.actionTarget || 'saisie'

  root.innerHTML = `
    <div class="dashboard-coach-content" style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div><span>Conseil Nexora du jour</span><strong>${escapeHtml(coachPriority)}</strong></div>
        <em style="font-size:12px;color:var(--text2)">${new Date().toLocaleDateString()}</em>
      </div>
      <div class="action-highlight dashboard-coach-highlight">
          <div style="font-size:13px;color:var(--text);line-height:1.4">${escapeHtml(coachAdvice)}</div>
          ${showDetails && coach.risks?.length ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">Risque : ${escapeHtml(coach.risks[0])}</div>` : ''}
          ${showDetails && coach.opportunities?.length ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">Opportunité : ${escapeHtml(coach.opportunities[0])}</div>` : ''}
          <button class="btn btn-outline" type="button" style="margin-top:8px" id="dashboard-coach-action">${escapeHtml(actionLabel)}</button>
      </div>
      ${simpleMode ? '' : `<div class="action-highlight dashboard-master-plan">
        <strong id="dm-action-title">${action.title}</strong>
        <div id="dm-action-detail" style="font-size:13px;color:var(--text2)">${action.detail}</div>
      </div>
      <div class="dashboard-master-plan" style="max-height:160px;overflow:auto;padding-right:6px">
        <strong style="display:block;margin-bottom:6px">Plan 7 jours</strong>
        <ol id="dm-7day-list" style="padding-left:18px;margin:0">
          ${plan.slice(0,7).map(p => `<li style="margin-bottom:6px"><strong>${new Date(p.date).toLocaleDateString()}</strong> — Solde: ${p.balance} €</li>`).join('')}
        </ol>
      </div>`}
    </div>
  `

  const coachAction = root.querySelector('#dashboard-coach-action')
  if (coachAction) coachAction.onclick = () => window.showSection?.(actionTarget)
  window.NexoraMotion?.animateCards?.(root)
}
