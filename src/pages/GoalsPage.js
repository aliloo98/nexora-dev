import { GoalsService } from '../goals/goalsService.js'
import { UserAppSettingsService } from '../../js/userAppSettingsService.js'
import createGoalCard from '../components/GoalCard.js'

const GOALS_STORAGE_KEY = 'nexora_goals_v1'
const traceGoalsStartup = (event, patch = {}) => {
  if (typeof window !== 'undefined' && window.nexoraTraceGoalsStartup) {
    window.nexoraTraceGoalsStartup(event, patch)
  }
}

const GoalsPage = {
  init: async () => {
    traceGoalsStartup('goalsPage:init:start')
    await GoalsService.init()
    GoalsPage.cache()
    GoalsPage.bind()
    await GoalsPage.hydrateFromCloud()
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
    traceGoalsStartup('goalsPage:init:finish')
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
    traceGoalsStartup('goalsPage:hydrateFromCloud:start')
    if (!window.supabase?.auth || !UserAppSettingsService?.syncCloudSettingToLocal) {
      traceGoalsStartup('goalsPage:hydrateFromCloud:skip-no-service')
      return
    }
    const sessionResp = await window.supabase.auth.getSession().catch(() => null)
    if (!sessionResp?.data?.session?.user?.id) {
      traceGoalsStartup('goalsPage:hydrateFromCloud:skip-no-user')
      return
    }
    await UserAppSettingsService.syncCloudSettingToLocal(GOALS_STORAGE_KEY)
    traceGoalsStartup('goalsPage:hydrateFromCloud:finish')
  },

  refreshFromCloud: async () => {
    traceGoalsStartup('goalsPage:refreshFromCloud:start')
    await GoalsPage.hydrateFromCloud()
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
    traceGoalsStartup('goalsPage:refreshFromCloud:finish')
  },

  render: async () => {
    traceGoalsStartup('goalsPage:render:start')
    if (!GoalsPage.listEl) GoalsPage.cache()
    if (!GoalsPage.listEl) {
      traceGoalsStartup('goalsPage:render:skip-no-list')
      return
    }
    const goals = await GoalsService.listGoals()
    const debugState = window.nexoraGoalsStartupDebug
    traceGoalsStartup('goalsPage:render:goals-loaded', {
      goalsServiceCount: goals.length,
      renderCount: (debugState?.renderCount || 0) + 1,
      lastRenderAt: new Date().toISOString()
    })
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
    traceGoalsStartup('goalsPage:render:finish', { goalsServiceCount: goals.length })
  },

  renderAnalytics: async () => {
    traceGoalsStartup('goalsPage:renderAnalytics:start')
    const { goals, totalTarget, totalCurrent, progressPct } = await GoalsService.getSummary()
    if (!GoalsPage.analyticsTarget) return
    GoalsPage.analyticsTarget.innerHTML = ''
    if (goals.length === 0) {
      GoalsPage.analyticsTarget.innerHTML = '<div style="color:var(--text2)">Aucun objectif</div>'
      traceGoalsStartup('goalsPage:renderAnalytics:finish-empty', { goalsServiceCount: goals.length })
      return
    }
    const primary = goals[0]
    const wrapper = document.createElement('div')
    wrapper.innerHTML = `<div style="font-weight:700">Principal: ${primary.name} — ${Math.round((primary.current/primary.target)*100)||0}%</div><div style="font-size:13px;color:var(--text2)">Total: ${totalCurrent.toLocaleString()} € / ${totalTarget.toLocaleString()} € — ${progressPct}%</div>`
    GoalsPage.analyticsTarget.appendChild(wrapper)
    traceGoalsStartup('goalsPage:renderAnalytics:finish', { goalsServiceCount: goals.length })
  }
}

export default GoalsPage
