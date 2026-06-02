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
  root.classList.add('dash-mini-card', 'fade-in')
  // gather minimal inputs from global services if available
  const baseBalance = (window?.MonthlyBudgetStateService?.getCurrentBalanceSync && typeof window.MonthlyBudgetStateService.getCurrentBalanceSync === 'function') ? window.MonthlyBudgetStateService.getCurrentBalanceSync() : 0
  const revenues = []
  const charges = []
  const plan = DashboardService.get7DayPlan({ fromDate: new Date(), baseBalance, revenues, charges })
  const action = DashboardService.getActionOfDay(plan)
  const coach = await getProactiveCoach().catch(() => null)
  const simpleMode = document.body?.classList?.contains('mode-simple')
  const showDetails = coach && !simpleMode

  root.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">✨</span><strong>Action du jour</strong></div>
        <em style="font-size:12px;color:var(--text2)">${new Date().toLocaleDateString()}</em>
      </div>
      ${coach ? `
        <div class="action-highlight">
          <strong>Conseil Nexora du jour</strong>
          <div style="font-size:13px;color:var(--text);line-height:1.4">${escapeHtml(coach.dailyAdvice)}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">Priorité : ${escapeHtml(coach.priority)}</div>
          ${showDetails && coach.risks?.length ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">Risque : ${escapeHtml(coach.risks[0])}</div>` : ''}
          ${showDetails && coach.opportunities?.length ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">Opportunité : ${escapeHtml(coach.opportunities[0])}</div>` : ''}
          <button class="btn btn-outline" type="button" style="margin-top:8px" id="dashboard-coach-action">${escapeHtml(coach.actionLabel || 'Voir le Plan')}</button>
        </div>
      ` : ''}
      <div class="action-highlight">
        <strong id="dm-action-title">${action.title}</strong>
        <div id="dm-action-detail" style="font-size:13px;color:var(--text2)">${action.detail}</div>
      </div>
      <div style="max-height:160px;overflow:auto;padding-right:6px">
        <strong style="display:block;margin-bottom:6px">Plan 7 jours</strong>
        <ol id="dm-7day-list" style="padding-left:18px;margin:0">
          ${plan.slice(0,7).map(p => `<li style="margin-bottom:6px"><strong>${new Date(p.date).toLocaleDateString()}</strong> — Solde: ${p.balance} €</li>`).join('')}
        </ol>
      </div>
    </div>
  `

  const coachAction = root.querySelector('#dashboard-coach-action')
  if (coachAction && coach) coachAction.onclick = () => window.showSection?.(coach.actionTarget || 'plan')
}
