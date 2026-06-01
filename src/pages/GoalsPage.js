import { GoalsService } from '../goals/goalsService.js'
import { UserAppSettingsService } from '../../js/userAppSettingsService.js'
import createGoalCard from '../components/GoalCard.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

const GOALS_STORAGE_KEY = STORAGE_KEYS.goals

const openGoalModal = async (options) => {
  if (typeof window.openNexoraActionModal === 'function') {
    return window.openNexoraActionModal(options)
  }
  return null
}

const readGoalNumber = (value, fallback) => {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (normalized === '') return fallback
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeGoalDate = (value) => {
  const date = String(value ?? '').trim()
  if (!date) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

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
    GoalsPage.form.date.value = ''
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
    if (typeof window.updateDashboardPrimaryGoal === 'function') await window.updateDashboardPrimaryGoal()
    if (typeof window.updateAll === 'function') window.updateAll()
  },

  handleEdit: async (goal) => {
    const newName = await openGoalModal({
      title: 'Modifier l’objectif',
      message: 'Nouveau nom de l’objectif',
      input: true,
      defaultValue: goal.name || '',
      required: true,
      confirmLabel: 'Continuer'
    })
    if (newName === null) return

    const targetValue = await openGoalModal({
      title: 'Modifier l’objectif',
      message: 'Montant cible en euros',
      input: true,
      defaultValue: String(goal.target || 0),
      required: true,
      confirmLabel: 'Continuer',
      validateValue: (value) => readGoalNumber(value, 0) > 0 ? '' : 'Le montant cible est requis'
    })
    if (targetValue === null) return

    const currentValue = await openGoalModal({
      title: 'Modifier l’objectif',
      message: 'Montant déjà épargné en euros',
      input: true,
      defaultValue: String(goal.current || 0),
      required: true,
      confirmLabel: 'Continuer',
      validateValue: (value) => readGoalNumber(value, -1) >= 0 ? '' : 'Le montant doit être positif'
    })
    if (currentValue === null) return

    const targetDateValue = await openGoalModal({
      title: 'Modifier l’échéance',
      message: 'Date cible optionnelle. Laissez vide pour supprimer l’échéance.',
      input: true,
      inputType: 'date',
      defaultValue: normalizeGoalDate(goal.targetDate) || '',
      required: false,
      confirmLabel: 'Enregistrer',
      validateValue: (value) => {
        const trimmed = String(value || '').trim()
        if (!trimmed) return ''
        return normalizeGoalDate(trimmed) ? '' : 'Utilisez une date valide'
      }
    })
    if (targetDateValue === null) return

    const newTarget = readGoalNumber(targetValue, Number(goal.target) || 0)
    const newCurrent = readGoalNumber(currentValue, Number(goal.current) || 0)
    await GoalsService.updateGoal(goal.id, { name: newName, target: newTarget, current: newCurrent, targetDate: normalizeGoalDate(targetDateValue) })
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
    if (typeof window.updateDashboardPrimaryGoal === 'function') await window.updateDashboardPrimaryGoal()
    if (typeof window.updateAll === 'function') window.updateAll()
  },

  handleDelete: async (goal) => {
    const ok = await openGoalModal({
      title: 'Supprimer l’objectif',
      message: `Supprimer l’objectif « ${goal.name} » ?`,
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    await GoalsService.deleteGoal(goal.id)
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
    if (typeof window.updateDashboardPrimaryGoal === 'function') await window.updateDashboardPrimaryGoal()
    if (typeof window.updateAll === 'function') window.updateAll()
  },

  handleSetPrimary: async (goal) => {
    if (!goal.isPrimary) {
      const ok = await openGoalModal({
        title: 'Objectif principal',
        message: `Définir « ${goal.name} » comme objectif principal ?`,
        confirmLabel: 'Définir'
      })
      if (!ok) return
    }
    await GoalsService.setPrimaryGoal(goal.id)
    window.showToast?.('🎯 Objectif principal mis à jour')
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
    if (typeof window.updateDashboardPrimaryGoal === 'function') {
      await window.updateDashboardPrimaryGoal()
    }
    if (typeof window.updateAll === 'function') window.updateAll()
  },

  hydrateFromCloud: async () => {
    if (!window.supabase?.auth || !UserAppSettingsService?.syncCloudSettingToLocal) {
      return
    }
    const sessionResp = await window.supabase.auth.getSession().catch(() => null)
    if (!sessionResp?.data?.session?.user?.id) {
      return
    }
    await UserAppSettingsService.syncCloudSettingToLocal(GOALS_STORAGE_KEY)
  },

  refreshFromCloud: async () => {
    await GoalsPage.hydrateFromCloud()
    await GoalsPage.render()
    await GoalsPage.renderAnalytics()
  },

  render: async () => {
    if (!GoalsPage.listEl) GoalsPage.cache()
    if (!GoalsPage.listEl) {
      return
    }
    const goals = await GoalsService.listGoals()
    GoalsPage.listEl.innerHTML = ''
    const monthlyInput = document.getElementById('goal-monthly-contrib')
    const monthly = monthlyInput ? Number(monthlyInput.value) || 0 : 0
    goals.forEach(g => {
      const est = GoalsService.estimateMonthsToTarget(g, monthly)
      if (est !== null) g.__estimatedMonths = est
      if (typeof GoalsService.getDeadlineInfo === 'function') {
        g.__deadlineInfo = GoalsService.getDeadlineInfo(g, monthly)
      }
      if (typeof GoalsService.getGoalForecast === 'function') {
        g.__forecast = GoalsService.getGoalForecast(g, monthly)
      }
      const card = createGoalCard(g, { onEdit: GoalsPage.handleEdit, onDelete: GoalsPage.handleDelete, onSetPrimary: GoalsPage.handleSetPrimary })
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
    const primary = await GoalsService.getPrimaryGoal()
    if (!primary) return
    const wrapper = document.createElement('div')
    wrapper.innerHTML = `<div style="font-weight:700">Principal: ${primary.name} — ${Math.round((primary.current/primary.target)*100)||0}%</div><div style="font-size:13px;color:var(--text2)">Total: ${totalCurrent.toLocaleString()} € / ${totalTarget.toLocaleString()} € — ${progressPct}%</div>`
    GoalsPage.analyticsTarget.appendChild(wrapper)
  }
}

export default GoalsPage
