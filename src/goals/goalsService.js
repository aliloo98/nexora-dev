import { StorageManager } from '../../js/storage.js'
import { UserAppSettingsService } from '../../js/userAppSettingsService.js'
import { getNamespacedStorageKey } from '../../js/userStorage.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { filterUserFacingRecords, isTechnicalRecordName } from '../utils/userFacingFilter.js'

const STORAGE_KEY = STORAGE_KEYS.goals

const normalizeTargetDate = (targetDate) => {
  if (!targetDate) return null
  const value = String(targetDate).trim()
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : value.slice(0, 10)
}

const normalizeGoals = (goals) => {
  const list = Array.isArray(goals) ? goals : []
  const primaryIndex = list.findIndex(goal => goal?.isPrimary === true)
  if (primaryIndex === -1 || list.length === 0) {
    return list.map(goal => ({ ...goal, targetDate: normalizeTargetDate(goal?.targetDate) }))
  }
  return list.map((goal, index) => ({ ...goal, targetDate: normalizeTargetDate(goal?.targetDate), isPrimary: index === primaryIndex }))
}

const getDeadlineInfo = (goal, monthlyContribution = 0) => {
  const current = Number(goal?.current) || 0
  const target = Number(goal?.target) || 0
  const remaining = Math.max(0, target - current)
  const targetDate = normalizeTargetDate(goal?.targetDate)
  const reached = target > 0 && current >= target

  if (!targetDate) {
    return { remaining, targetDate: null, monthsRemaining: null, monthlyEffort: null, status: reached ? 'reached' : 'none' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(`${targetDate}T00:00:00`)
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  const monthsRemaining = diffDays > 0 ? Math.max(1, Math.ceil(diffDays / 30)) : 0
  const monthlyEffort = reached ? 0 : monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : null
  const projectedMonths = GoalsService.estimateMonthsToTarget(goal, monthlyContribution)
  const status = reached ? 'reached' : diffDays < 0 ? 'past' : 'future'

  return { remaining, targetDate, monthsRemaining, monthlyEffort, projectedMonths, status }
}

const getGoalForecast = (goal, monthlyContribution = 0) => {
  const current = Number(goal?.current) || 0
  const target = Number(goal?.target) || 0
  const remaining = Math.max(0, target - current)
  const deadline = getDeadlineInfo(goal, monthlyContribution)
  const estimatedMonths = GoalsService.estimateMonthsToTarget(goal, monthlyContribution)
  const reached = target > 0 && current >= target
  const empty = target > 0 && current <= 0
  let projectedDate = null

  if (estimatedMonths !== null) {
    projectedDate = new Date()
    projectedDate.setMonth(projectedDate.getMonth() + estimatedMonths)
  }

  let status = 'on_track'
  if (reached) status = 'reached'
  else if (empty) status = 'empty'
  else if (deadline.status === 'past') status = 'late'
  else if (deadline.monthlyEffort && monthlyContribution > 0 && deadline.monthlyEffort > monthlyContribution * 1.15) status = 'behind'
  else if (deadline.monthlyEffort && monthlyContribution > 0 && monthlyContribution >= deadline.monthlyEffort) status = 'ahead'

  const projectedLabel = reached
    ? 'Objectif atteint'
    : estimatedMonths
      ? `À ce rythme vous atteindrez ${goal?.name || 'cet objectif'} dans ${estimatedMonths} mois.`
      : 'Ajoutez une contribution mensuelle pour calculer la projection.'

  return {
    remaining,
    estimatedMonths,
    projectedDate: projectedDate ? projectedDate.toISOString().slice(0, 10) : null,
    monthlyEffort: deadline.monthlyEffort,
    monthsRemaining: deadline.monthsRemaining,
    status,
    projectedLabel
  }
}

const getGoals = async () => {
  const { value } = await UserAppSettingsService.getSetting(STORAGE_KEY)
  if (Array.isArray(value)) {
    return normalizeGoals(value)
  }

  const namespacedKey = getNamespacedStorageKey(STORAGE_KEY)
  const raw = await StorageManager.getItem(namespacedKey)
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

  listUserFacingGoals: async () => filterUserFacingRecords(await getGoals(), (goal) => goal?.name),

  isTechnicalGoalName: isTechnicalRecordName,

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
    entry.targetDate = normalizeTargetDate(entry.targetDate)
    goals.push(entry)
    await GoalsService.saveGoals(goals)
    return entry
  },

  updateGoal: async (id, patch) => {
    const goals = await GoalsService.listGoals()
    const idx = goals.findIndex(g => g.id === id)
    if (idx === -1) return null
    goals[idx] = Object.assign({}, goals[idx], patch)
    if (Object.prototype.hasOwnProperty.call(patch || {}, 'targetDate')) {
      goals[idx].targetDate = normalizeTargetDate(patch.targetDate)
    }
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
    const goals = filterUserFacingRecords(await GoalsService.listGoals(), (goal) => goal?.name)
    if (goals.length === 0) return null
    return goals.find(goal => goal.isPrimary === true) || goals[0]
  },

  estimateMonthsToTarget: (goal, monthlyContribution) => {
    const remaining = Math.max(0, (Number(goal.target) || 0) - (Number(goal.current) || 0))
    monthlyContribution = Number(monthlyContribution) || 0
    if (monthlyContribution <= 0) return null
    return Math.ceil(remaining / monthlyContribution)
  },

  getDeadlineInfo,

  getGoalForecast,

  getSummary: async () => {
    const allGoals = await GoalsService.listGoals()
    const goals = filterUserFacingRecords(allGoals, (goal) => goal?.name)
    const totalTarget = goals.reduce((s, g) => s + (Number(g.target) || 0), 0)
    const totalCurrent = goals.reduce((s, g) => s + (Number(g.current) || 0), 0)
    const progressPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
    return { goals, totalTarget, totalCurrent, progressPct }
  }
}

export { GoalsService }
