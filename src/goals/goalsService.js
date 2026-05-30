import { StorageManager } from '../../js/storage.js'
import { UserAppSettingsService } from '../../js/userAppSettingsService.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

const STORAGE_KEY = STORAGE_KEYS.goals

const normalizeGoals = (goals) => {
  const list = Array.isArray(goals) ? goals : []
  const primaryIndex = list.findIndex(goal => goal?.isPrimary === true)
  if (primaryIndex === -1 || list.length === 0) return list
  return list.map((goal, index) => ({ ...goal, isPrimary: index === primaryIndex }))
}

const getGoals = async () => {
  const { value } = await UserAppSettingsService.getSetting(STORAGE_KEY)
  if (Array.isArray(value)) {
    return normalizeGoals(value)
  }

  const raw = await StorageManager.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? normalizeGoals(parsed) : []
  } catch (err) {
    return []
  }
}

const GoalsService = {
  init: async () => {
    await StorageManager.initIndexedDB()
  },

  getGoals,

  listGoals: getGoals,

  saveGoals: async (goals) => {
    const goalsToSave = normalizeGoals(goals || [])
    await UserAppSettingsService.saveSetting(STORAGE_KEY, goalsToSave)
    if (typeof UserAppSettingsService.syncLocalSettingToCloud === 'function') {
      await UserAppSettingsService.syncLocalSettingToCloud(STORAGE_KEY).catch((err) => {
        console.warn('[UserAppSettingsService] failed to sync goals to cloud', err)
      })
    }
    return true
  },

  createGoal: async (goal) => {
    const goals = await GoalsService.listGoals()
    const now = Date.now()
    const entry = Object.assign({ id: String(now), name: '', target: 0, current: 0, color: '#e5c060', icon: '🎯', targetDate: null, isPrimary: goals.length === 0 }, goal)
    goals.push(entry)
    await GoalsService.saveGoals(goals)
    return entry
  },

  updateGoal: async (id, patch) => {
    const goals = await GoalsService.listGoals()
    const idx = goals.findIndex(g => g.id === id)
    if (idx === -1) return null
    goals[idx] = Object.assign({}, goals[idx], patch)
    await GoalsService.saveGoals(goals)
    return goals[idx]
  },

  deleteGoal: async (id) => {
    let goals = await GoalsService.listGoals()
    const deletedGoal = goals.find(g => g.id === id)
    goals = goals.filter(g => g.id !== id)
    if (deletedGoal?.isPrimary && goals[0]) goals[0].isPrimary = true
    await GoalsService.saveGoals(goals)
    return true
  },

  setPrimaryGoal: async (id) => {
    const goals = await GoalsService.listGoals()
    const exists = goals.some(goal => goal.id === id)
    if (!exists) return null
    const updated = goals.map(goal => ({ ...goal, isPrimary: goal.id === id }))
    await GoalsService.saveGoals(updated)
    return updated.find(goal => goal.id === id) || null
  },

  getPrimaryGoal: async () => {
    const goals = await GoalsService.listGoals()
    if (goals.length === 0) return null
    const primary = goals.find(goal => goal.isPrimary === true)
    if (primary) return primary
    goals[0].isPrimary = true
    await GoalsService.saveGoals(goals)
    return goals[0]
  },

  estimateMonthsToTarget: (goal, monthlyContribution) => {
    const remaining = Math.max(0, (Number(goal.target) || 0) - (Number(goal.current) || 0))
    monthlyContribution = Number(monthlyContribution) || 0
    if (monthlyContribution <= 0) return null
    return Math.ceil(remaining / monthlyContribution)
  },

  getSummary: async () => {
    const goals = await GoalsService.listGoals()
    const totalTarget = goals.reduce((s, g) => s + (Number(g.target) || 0), 0)
    const totalCurrent = goals.reduce((s, g) => s + (Number(g.current) || 0), 0)
    const progressPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
    return { goals, totalTarget, totalCurrent, progressPct }
  }
}

export { GoalsService }
