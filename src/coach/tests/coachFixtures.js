import { createCoachContext } from '../models/coachContext.js'

const baseInput = {
  asOf: '2026-07-15T12:00:00.000Z',
  monthKey: '2026-07',
  cycle: {
    start: '2026-07-01',
    end: '2026-07-31',
    elapsedDays: 15,
    remainingDays: 16,
    totalDays: 31,
    progress: (15 / 31) * 100
  },
  monthly: {
    income: 3000,
    plannedExpenses: 2100,
    paidExpenses: 1500,
    currentBalance: 1500,
    projectedBalance: 900,
    remainingExpenses: 600,
    expenseRate: 70
  },
  categories: [],
  upcomingCharges: [],
  goals: [],
  history: [],
  dataQuality: {
    completeness: 1,
    missingFields: [],
    historyDepth: 0,
    isReliable: true
  }
}

const mergeInput = (base, override) => {
  const next = { ...base, ...override }
  for (const key of ['cycle', 'monthly', 'dataQuality']) {
    next[key] = { ...base[key], ...(override?.[key] || {}) }
  }
  for (const key of ['categories', 'upcomingCharges', 'goals', 'history']) {
    next[key] = Object.prototype.hasOwnProperty.call(override || {}, key) ? override[key] : base[key]
  }
  return next
}

export const createCoachFixture = (override = {}) => createCoachContext(mergeInput(baseInput, override))

export const deficitFixture = () => createCoachFixture({
  monthly: {
    plannedExpenses: 3200,
    projectedBalance: -200,
    expenseRate: 3200 / 30
  }
})

export const criticalRemainderFixture = () => createCoachFixture({
  monthly: {
    plannedExpenses: 2840,
    projectedBalance: 160,
    expenseRate: 2840 / 30
  }
})

export const healthyMonthFixture = () => createCoachFixture()

export const allocatableSurplusFixture = () => createCoachFixture({
  monthly: {
    plannedExpenses: 2000,
    projectedBalance: 1000,
    expenseRate: 2000 / 30
  }
})

export const nearGoalFixture = () => createCoachFixture({
  goals: [{
    id: 'home',
    name: 'Maison',
    target: 1000,
    current: 820,
    targetDate: '2026-08-14',
    isPrimary: true
  }]
})

export const incompleteDataFixture = () => createCoachFixture({
  monthly: {
    income: 0,
    plannedExpenses: 0,
    paidExpenses: 0,
    currentBalance: 0,
    projectedBalance: 0,
    remainingExpenses: 0,
    expenseRate: null
  },
  dataQuality: {
    completeness: 0,
    missingFields: ['income', 'expenses'],
    isReliable: false
  }
})

export default {
  createCoachFixture,
  deficitFixture,
  criticalRemainderFixture,
  healthyMonthFixture,
  allocatableSurplusFixture,
  nearGoalFixture,
  incompleteDataFixture
}
