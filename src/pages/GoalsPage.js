import { GoalsService } from '../goals/goalsService.js'
import { UserAppSettingsService } from '../../js/userAppSettingsService.js'
import createGoalCard from '../components/GoalCard.js'

const GOALS_STORAGE_KEY = 'nexora_goals_v1'

const GoalsPage = {
  init: async () => {
    await GoalsService.init()
    GoalsPage.cache()
    GoalsPage.bind()
    await GoalsPage.hydrateFromCloud()
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
  },

  cache: () => {
    GoalsPage.container = document.getElementById('section-objectifs')
    GoalsPage.listEl = document.getElementById('goals-list')
    GoalsPage.form = {
      name: document.getElementById('goal-new-name'),
      target: document.getElementById('goal-new-target'),
      current: document.getElementById('goal-new-current'),
      date: document.getElementById('goal-new-date'),
      color: document.getElementById('goal-new-color'),
      icon: document.getElementById('goal-new-icon'),
      createBtn: document.getElementById('goal-create-btn')
    }
    GoalsPage.analyticsTarget = document.getElementById('analytics-goals')
  },

  bind: () => {
    if (GoalsPage.form && GoalsPage.form.createBtn) {
      GoalsPage.form.createBtn.onclick = GoalsPage.handleCreate
    }
  },

  handleCreate: async () => {
    const name = GoalsPage.form.name.value.trim()
    const target = Number(GoalsPage.form.target.value) || 0
    const current = Number(GoalsPage.form.current.value) || 0
    const date = GoalsPage.form.date.value || null
    const color = GoalsPage.form.color.value || '#e5c060'
    const icon = GoalsPage.form.icon.value || '🎯'
    if (!name || target <= 0) {
      window.showToast('Nom et montant cible obligatoires')
      return
    }
    await GoalsService.createGoal({ name, target, current, targetDate: date, color, icon })
    GoalsPage.form.name.value = ''
    GoalsPage.form.target.value = ''
    GoalsPage.form.current.value = '0'
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
  },

  handleEdit: async (goal) => {
    // Simple prompt-based edit for now
    const newName = prompt('Nom de l\'objectif', goal.name) || goal.name
    const newTarget = Number(prompt('Montant cible', goal.target) || goal.target)
    const newCurrent = Number(prompt('Montant déjà épargné', goal.current) || goal.current)
    await GoalsService.updateGoal(goal.id, { name: newName, target: newTarget, current: newCurrent })
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
  },

  handleDelete: async (goal) => {
    const ok = confirm(`Supprimer l\'objectif « ${goal.name} » ?`)
    if (!ok) return
    await GoalsService.deleteGoal(goal.id)
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
  },

  hydrateFromCloud: async () => {
    if (!window.supabase?.auth || !UserAppSettingsService?.syncCloudSettingToLocal) return
    const sessionResp = await window.supabase.auth.getSession().catch(() => null)
    if (!sessionResp?.data?.session?.user?.id) return
    await UserAppSettingsService.syncCloudSettingToLocal(GOALS_STORAGE_KEY)
  },

  refreshFromCloud: async () => {
    await GoalsPage.hydrateFromCloud()
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
  },

  render: async () => {
    if (!GoalsPage.listEl) GoalsPage.cache()
    if (!GoalsPage.listEl) return
    const goals = await GoalsService.listGoals()
    GoalsPage.listEl.innerHTML = ''
    const monthlyInput = document.getElementById('goal-monthly-contrib')
    const monthly = monthlyInput ? Number(monthlyInput.value) || 0 : 0
    goals.forEach(g => {
      const est = GoalsService.estimateMonthsToTarget(g, monthly)
      if (est !== null) g.__estimatedMonths = est
      const card = createGoalCard(g, { onEdit: GoalsPage.handleEdit, onDelete: GoalsPage.handleDelete })
      GoalsPage.listEl.appendChild(card)
    })
    if (goals.length === 0) GoalsPage.listEl.innerHTML = '<div style="color:var(--text2);">Aucun objectif pour l\'instant.</div>'
  },

  renderAnalytics: async () => {
    const { goals, totalTarget, totalCurrent, progressPct } = await GoalsService.getSummary()
    if (!GoalsPage.analyticsTarget) return
    GoalsPage.analyticsTarget.innerHTML = ''
    if (goals.length === 0) {
      GoalsPage.analyticsTarget.innerHTML = '<div style="color:var(--text2)">Aucun objectif</div>'
      return
    }
    const primary = goals[0]
    const wrapper = document.createElement('div')
    wrapper.innerHTML = `<div style="font-weight:700">Principal: ${primary.name} — ${Math.round((primary.current/primary.target)*100)||0}%</div><div style="font-size:13px;color:var(--text2)">Total: ${totalCurrent.toLocaleString()} € / ${totalTarget.toLocaleString()} € — ${progressPct}%</div>`
    GoalsPage.analyticsTarget.appendChild(wrapper)
  }
}

export default GoalsPage
