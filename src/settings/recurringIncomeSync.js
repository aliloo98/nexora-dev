/**
 * Schéma et fusion sync des revenus récurrents (multi-device).
 * Ne pas dupliquer la logique ailleurs — source pour SettingsService + UserAppSettingsService.
 */

const nowIso = () => new Date().toISOString()

const makeId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const isPresent = (value) => {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

const itemTimestamp = (item) => {
  const value = item?.updated_at || item?.updatedAt || item?.modified_at || item?.created_at || item?.createdAt || 0
  const time = value ? new Date(value).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

const normalizeNameKey = (item) => String(item?.name || item?.title || item?.label || '').trim().toLowerCase()

const FREQUENCY_ALIASES = {
  monthly: ['monthly', 'mensuel', 'month', 'mois'],
  weekly: ['weekly', 'hebdomadaire', 'week', 'semaine'],
  biweekly: ['biweekly', 'bi-hebdo', 'biweekly', 'quinzaine', 'bimensuel'],
  once: ['once', 'unique', 'one-time', 'onetime', 'ponctuel']
}

const resolveFrequency = (entry = {}) => {
  const raw = String(entry.frequency || entry.recurrence || entry.recurringFrequency || entry.interval || '').trim().toLowerCase()
  if (!raw) return null
  for (const [canonical, aliases] of Object.entries(FREQUENCY_ALIASES)) {
    if (aliases.includes(raw)) return canonical
  }
  return ['monthly', 'weekly', 'biweekly', 'once'].includes(raw) ? raw : null
}

const resolveDay = (entry = {}) => {
  const raw = entry.day ?? entry.payDay ?? entry.dayOfMonth ?? entry.date ?? entry.dueDay
  const day = Number(raw)
  if (!Number.isFinite(day)) return null
  return Math.max(1, Math.min(31, day))
}

const resolveAmountRaw = (entry = {}) => {
  const candidates = [entry.amount, entry.value, entry.montant, entry.income]
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue
    if (typeof candidate === 'string' && candidate.trim() === '') continue
    return candidate
  }
  return null
}

/**
 * Normalise un enregistrement brut (Mac / PWA / cloud) vers le schéma canonique.
 * @param {object} entry
 * @param {{ parseAmount?: (v: unknown) => number|null }} [options]
 */
export function normalizeRecurringIncome(entry = {}, options = {}) {
  const parseAmount = options.parseAmount || ((value) => {
    const num = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(num) ? num : null
  })

  const amountRaw = resolveAmountRaw(entry)
  const parsedAmount = amountRaw === null ? null : parseAmount(amountRaw)
  const frequency = resolveFrequency(entry)
  const day = resolveDay(entry)

  return {
    id: entry.id || entry.local_id || makeId('income'),
    name: String(entry.name || entry.title || entry.label || '').trim() || 'Revenu récurrent',
    amount: parsedAmount === null ? 0 : parsedAmount,
    day: day === null ? 1 : day,
    frequency: frequency || 'monthly',
    updated_at: entry.updated_at || entry.updatedAt || nowIso()
  }
}

export function normalizeRecurringIncomeList(entries = [], options = {}) {
  return Array.isArray(entries) ? entries.map((entry) => normalizeRecurringIncome(entry, options)) : []
}

const pickFieldByRecency = (items, fieldNames, { allowZero = false } = {}) => {
  let best = undefined
  let bestTime = -1

  items.forEach((item) => {
    const time = itemTimestamp(item)
    fieldNames.forEach((field) => {
      const value = item?.[field]
      if (value === undefined || value === null) return
      if (typeof value === 'string' && value.trim() === '') return
      if (!allowZero && (value === 0 || value === '0')) return
      if (time >= bestTime) {
        best = value
        bestTime = time
      }
    })
  })

  return best
}

/**
 * Fusionne plusieurs versions du même revenu (champ par champ, valeur non vide la plus récente).
 * @param {object[]} items
 * @param {{ parseAmount?: Function }} [options]
 */
export function mergeRecurringIncomeItems(items = [], options = {}) {
  if (!Array.isArray(items) || !items.length) return null
  if (items.length === 1) return normalizeRecurringIncome(items[0], options)

  const id = pickFieldByRecency(items, ['id', 'local_id'])
  const name = pickFieldByRecency(items, ['name', 'title', 'label'])
  const amount = pickFieldByRecency(items, ['amount', 'value', 'montant', 'income'])
  const frequency = pickFieldByRecency(items, ['frequency', 'recurrence', 'recurringFrequency', 'interval'])
  const day = pickFieldByRecency(items, ['day', 'payDay', 'dayOfMonth', 'date', 'dueDay'])
  const newestTime = Math.max(...items.map(itemTimestamp), 0)

  return normalizeRecurringIncome({
    id,
    name,
    amount,
    frequency,
    day,
    updated_at: newestTime > 0 ? new Date(newestTime).toISOString() : nowIso()
  }, options)
}

const bucketIdentity = (item, index) => {
  if (item?.id) return `id:${String(item.id).toLowerCase()}`
  const name = normalizeNameKey(item)
  if (name) return `name:${name}`
  return `anon:${index}`
}

/**
 * Fusion cloud/local : une entrée par revenu, alias de champs, liaison id ↔ nom.
 */
export function mergeRecurringIncomeArrays(localValue = [], cloudValue = [], options = {}) {
  const conflicts = []
  const buckets = new Map()
  const all = [
    ...(Array.isArray(localValue) ? localValue : []).map((item, index) => ({ item, source: 'local', index })),
    ...(Array.isArray(cloudValue) ? cloudValue : []).map((item, index) => ({ item, source: 'cloud', index }))
  ]

  const resolveBucketKey = (item, index) => {
    const name = normalizeNameKey(item)

    if (name) {
      for (const [key, entries] of buckets) {
        const existing = entries[0]?.item
        if (!existing || normalizeNameKey(existing) !== name) continue
        if (key.startsWith('id:')) return key
        if (item?.id) {
          const idKey = `id:${String(item.id).toLowerCase()}`
          if (key !== idKey) {
            const prior = buckets.get(key) || []
            buckets.delete(key)
            buckets.set(idKey, prior)
          }
          return idKey
        }
        return key
      }
    }

    if (item?.id) return `id:${String(item.id).toLowerCase()}`
    if (name) return `name:${name}`
    return bucketIdentity(item, index)
  }

  all.forEach(({ item, source, index }) => {
    const identity = resolveBucketKey(item, index)
    if (!buckets.has(identity)) buckets.set(identity, [])
    buckets.get(identity).push({ item, source })
  })

  const value = []
  for (const [identity, entries] of buckets) {
    const items = entries.map((entry) => entry.item)
    if (entries.length > 1) {
      conflicts.push({
        identity,
        kept: 'merged-fields',
        replaced: [...new Set(entries.map((entry) => entry.source))].join('+')
      })
    }
    const merged = mergeRecurringIncomeItems(items, options)
    if (merged) value.push(merged)
  }

  return { value, conflicts }
}

export default {
  normalizeRecurringIncome,
  normalizeRecurringIncomeList,
  mergeRecurringIncomeItems,
  mergeRecurringIncomeArrays
}
