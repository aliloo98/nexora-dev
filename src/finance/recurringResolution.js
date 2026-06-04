const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const normalizeAmount = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const raw = String(value || '').trim()
    .replace(/[\u00A0\u202F\u2009\u2007]/g, ' ')
    .replace(/\s+/g, '')
  if (!raw) return 0

  const hasComma = raw.includes(',')
  const hasDot = raw.includes('.')
  let normalized = raw

  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = raw.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = raw.replace(/,/g, '.')
  }

  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

const safeNumber = (value) => normalizeAmount(value)

const timestamp = (value) => {
  const raw = value?.updated_at || value?.updatedAt || value?.created_at || value?.createdAt
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

const similar = (a, b) => {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

const findMatchingRecurring = (key, label, recurring = []) => recurring.find((item) => {
  const linked = item.linkedCharge || item.categoryKey || item.key || item.sourceKey
  if (linked && linked === key) return true
  return similar(item.name || item.title || item.label, label || key)
})

const resolveAmount = ({ key, label, manualAmount, manualMeta, recurringItem }) => {
  const manual = safeNumber(manualAmount)
  const recurring = recurringItem ? safeNumber(recurringItem.amount) : 0
  const manualTime = timestamp(manualMeta)
  const recurringTime = timestamp(recurringItem)

  if (manualTime || recurringTime) {
    if (manualTime >= recurringTime && manual > 0) return { amount: manual, source: 'manual_latest' }
    if (recurring > 0) return { amount: recurring, source: 'recurring_latest' }
  }

  if (recurring > 0) return { amount: recurring, source: 'recurring_default' }
  return { amount: manual, source: 'manual_default' }
}

export function resolveBudgetWithRecurring({ budgetData = {}, incomeKeys = [], expenseKeys = [], categoriesById = new Map(), recurringIncomes = [], billSchedules = [] } = {}) {
  const resolved = {}
  const decisions = []

  incomeKeys.forEach((key) => {
    const category = categoriesById.get(key)
    const recurringItem = findMatchingRecurring(key, category?.name, recurringIncomes)
    const decision = resolveAmount({
      key,
      label: category?.name,
      manualAmount: budgetData[key] ?? budgetData[`${key}_reel`],
      manualMeta: budgetData[`${key}_meta`],
      recurringItem
    })
    resolved[key] = decision.amount
    decisions.push({ key, type: 'income', ...decision, recurringId: recurringItem?.id || null })
  })

  expenseKeys.forEach((key) => {
    const category = categoriesById.get(key)
    const recurringItem = findMatchingRecurring(key, category?.name, billSchedules)
    const decision = resolveAmount({
      key,
      label: category?.name,
      manualAmount: budgetData[key] ?? budgetData[`${key}_reel`],
      manualMeta: budgetData[`${key}_meta`],
      recurringItem
    })
    resolved[key] = decision.amount
    decisions.push({ key, type: 'expense', ...decision, recurringId: recurringItem?.id || null })
  })

  return { resolved, decisions }
}

export default { resolveBudgetWithRecurring }
