import { StorageManager } from '../../js/storage.js'
import { UserAppSettingsService } from '../../js/userAppSettingsService.js'

const STORAGE_KEY = 'nexora_goals_v1'

const getGoals = async () => {
  const { value } = await UserAppSettingsService.getSetting(STORAGE_KEY)
  if (Array.isArray(value)) {
    console.log('[GOALS GET]', value)
    return value
  }

  const raw = await StorageManager.getItem(STORAGE_KEY)
  if (!raw) {
    console.log('[GOALS GET]', [])
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    const goals = Array.isArray(parsed) ? parsed : []
    console.log('[GOALS GET]', goals)
    return goals
  } catch (err) {
    console.log('[GOALS GET]', [])
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
    const goalsToSave = goals || []
    console.log('[GOALS BEFORE SAVE]', goalsToSave)
    await UserAppSettingsService.saveSetting(STORAGE_KEY, goalsToSave)
    console.log('[GOALS AFTER LOCAL SAVE]', await getGoals())
    if (typeof UserAppSettingsService.syncLocalSettingToCloud === 'function') {
      await UserAppSettingsService.syncLocalSettingToCloud(STORAGE_KEY).catch((err) => {
        console.warn('[UserAppSettingsService] failed to sync goals to cloud', err)
      })
    }
    return true
  },

  createGoal: async (goal) => {
    console.log('[GOALS CREATE INPUT]', goal)
    const goals = await GoalsService.listGoals()
    const now = Date.now()
    const entry = Object.assign({ id: String(now), name: '', target: 0, current: 0, color: '#e5c060', icon: '🎯', targetDate: null }, goal)
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
    goals = goals.filter(g => g.id !== id)
    await GoalsService.saveGoals(goals)
    return true
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
