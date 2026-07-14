/**
 * Nexora - MonthlyBudgetStateService
 *
 * Source de verite V1 pour la synchronisation multi-appareils du budget mensuel.
 * Le snapshot JSON conserve toutes les cles historiques: montants, *_paye,
 * note_*, categories personnalisees et futures donnees du mois.
 */

import { supabase } from '../src/supabase.js'
import { getNamespacedStorageKey, getCurrentUserId } from './userStorage.js'

const TABLE_NAME = 'monthly_budget_states'
const META_KEY = 'nexora_monthly_budget_states_meta_v1'
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
let onlineReplayAttached = false
const pendingReplays = new Map()
const monthlyPushes = new Map()

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine
const storageKey = (monthKey, userId) => {
  const ownerId = userId || getCurrentUserId()
  return ownerId ? `budget_${ownerId}_${monthKey}` : `budget_${monthKey}`
}

const getStorageClient = () => {
  if (typeof SafeStorage !== 'undefined') return SafeStorage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

const getSupabaseSession = async () => {
  const authResponse = await supabase.auth.getSession()
  return {
    session: authResponse.data?.session || null,
    error: authResponse.error || null
  }
}

const readJson = (key, fallback) => {
  try {
    const storage = getStorageClient()
    if (!storage) return fallback
    const raw = storage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : fallback
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] local read fallback:', err)
    return fallback
  }
}

const writeJson = (key, value) => {
  try {
    const storage = getStorageClient()
    if (!storage) return false
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] local write fallback:', err)
    return false
  }
}

const readLocalMonth = (monthKey, userId) => readJson(storageKey(monthKey, userId), {})
const writeLocalMonth = (monthKey, data, userId) => writeJson(storageKey(monthKey, userId), data)

const metaStorageKey = (userId) => getNamespacedStorageKey(META_KEY, userId)
const readMeta = (userId) => readJson(metaStorageKey(userId), {})

const writeMeta = (monthKey, meta, userId) => {
  const current = readMeta(userId)
  current[monthKey] = {
    ...(current[monthKey] || {}),
    ...meta,
    cached_at: new Date().toISOString()
  }
  return writeJson(metaStorageKey(userId), current)
}

const removeMeta = (monthKey, userId) => {
  const current = readMeta(userId)
  delete current[monthKey]
  return writeJson(metaStorageKey(userId), current)
}

const getLocalUpdatedAt = (monthKey, userId) => {
  const meta = readMeta(userId)[monthKey] || {}
  return meta.local_updated_at || meta.cloud_updated_at || null
}

const getPendingMonthKeys = (userId = getCurrentUserId()) => Object.entries(readMeta(userId))
  .filter(([monthKey, meta]) => MONTH_KEY_PATTERN.test(monthKey) && meta?.pending_operation === 'upsert')
  .map(([monthKey]) => monthKey)
  .sort()

const isRemoteNewerOrEqual = (remoteUpdatedAt, localUpdatedAt) => {
  if (!remoteUpdatedAt) return false
  if (!localUpdatedAt) return true
  return new Date(remoteUpdatedAt).getTime() >= new Date(localUpdatedAt).getTime()
}

const normalizeSnapshot = (data) => {
  try {
    const parsed = JSON.parse(JSON.stringify(data || {}))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const createPendingToken = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const performMonthlyBudgetPush = async (monthKey, snapshot, localUpdatedAt, pendingToken, ownerId) => {
  if (!monthKey || !isOnline()) {
    return { data: snapshot, source: 'local', synced: false, reason: 'offline' }
  }

  try {
    const { session, error: sessionError } = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        data: snapshot,
        source: 'local',
        synced: false,
        reason: sessionError ? 'session-error' : 'no-session'
      }
    }
    if (userId !== ownerId) {
      return { data: snapshot, source: 'local', synced: false, reason: 'owner-changed' }
    }

    const updatedAt = localUpdatedAt || new Date().toISOString()
    const payload = {
      user_id: userId,
      month_key: monthKey,
      data: snapshot,
      updated_at: updatedAt
    }

    const { data: saved, error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: 'user_id,month_key' })
      .select('data,updated_at')
      .single()

    if (error) throw error

    const savedSnapshot = normalizeSnapshot(saved?.data || snapshot)
    const cloudUpdatedAt = saved?.updated_at || updatedAt
    const currentMeta = readMeta(ownerId)[monthKey] || {}
    if (pendingToken && currentMeta.pending_token !== pendingToken) {
      return {
        data: readLocalMonth(monthKey, ownerId),
        source: 'local',
        synced: false,
        reason: 'local-changed-during-sync',
        updated_at: cloudUpdatedAt
      }
    }
    writeLocalMonth(monthKey, savedSnapshot, ownerId)
    writeMeta(monthKey, {
      source: 'cloud',
      cloud_updated_at: cloudUpdatedAt,
      local_updated_at: cloudUpdatedAt,
      pending_operation: null,
      pending_since: null,
      pending_token: null
    }, ownerId)

    return {
      data: savedSnapshot,
      source: 'cloud',
      synced: true,
      updated_at: cloudUpdatedAt
    }
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] cloud write fallback:', err)
    return { data: snapshot, source: 'local', synced: false, reason: 'cloud-error', error: err }
  }
}

const pushMonthlyBudgetState = (monthKey, snapshot, localUpdatedAt, pendingToken, ownerId) => {
  const operationKey = `${ownerId || 'anonymous'}:${monthKey}`
  const previous = monthlyPushes.get(operationKey) || Promise.resolve()
  const operation = previous
    .catch(() => {})
    .then(() => performMonthlyBudgetPush(monthKey, snapshot, localUpdatedAt, pendingToken, ownerId))
  monthlyPushes.set(operationKey, operation)
  operation.then(
    () => {
      if (monthlyPushes.get(operationKey) === operation) monthlyPushes.delete(operationKey)
    },
    () => {
      if (monthlyPushes.get(operationKey) === operation) monthlyPushes.delete(operationKey)
    }
  )
  return operation
}

const DEFAULT_CATEGORY_GROUPS = {
  income: ['rev_ali', 'rev_megane', 'rev_excep'],
  fixed_expense: [
    'loyer', 'credit', 'assauto', 'gasoil', 'elec', 'eau', 'psy', 'diete',
    'itou', 'sante', 'impots', 'box', 'tel_ali', 'tel_meg', 'stream', 'ps',
    'cb', 'impfix'
  ],
  variable_expense: ['courses', 'tabac', 'sport', 'ongles', 'cadeaux', 'impvar']
}

const parseAmount = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

const readAmount = (budgetData, key) => {
  if (!budgetData || typeof budgetData !== 'object') return 0
  if (Object.prototype.hasOwnProperty.call(budgetData, key)) return parseAmount(budgetData[key])
  if (Object.prototype.hasOwnProperty.call(budgetData, `${key}_reel`)) return parseAmount(budgetData[`${key}_reel`])
  return 0
}

const readPaidAmount = (budgetData, key) => {
  if (!budgetData || typeof budgetData !== 'object') return 0
  const value = budgetData[`${key}_paye`]
  if (value === true) return readAmount(budgetData, key)
  if (value === false) return 0
  return Math.min(readAmount(budgetData, key), Math.max(0, parseAmount(value)))
}

const getBudgetSummary = (budgetData) => {
  const incomeKeys = DEFAULT_CATEGORY_GROUPS.income || []
  const expenseKeys = [
    ...(DEFAULT_CATEGORY_GROUPS.fixed_expense || []),
    ...(DEFAULT_CATEGORY_GROUPS.variable_expense || [])
  ]

  const totalIncome = incomeKeys.reduce((sum, key) => sum + readAmount(budgetData, key), 0)
  const totalExpenses = expenseKeys.reduce((sum, key) => sum + readAmount(budgetData, key), 0)
  const paidExpenses = expenseKeys.reduce((sum, key) => sum + readPaidAmount(budgetData, key), 0)
  const remainingExpenses = Math.max(0, totalExpenses - paidExpenses)

  return {
    totalIncome,
    totalExpenses,
    paidExpenses,
    remainingExpenses,
    currentBalance: totalIncome - paidExpenses,
    projectedBalance: totalIncome - totalExpenses
  }
}

const getMonthlyBudgetState = async (monthKey) => {
  const ownerId = getCurrentUserId()
  const localData = readLocalMonth(monthKey, ownerId)
  const localUpdatedAt = getLocalUpdatedAt(monthKey, ownerId)

  if (!monthKey || !isOnline()) {
    return { data: localData, source: 'local', synced: false }
  }

  const localMeta = readMeta(ownerId)[monthKey] || {}
  if (localMeta.pending_operation === 'upsert') {
    return pushMonthlyBudgetState(monthKey, localData, localUpdatedAt, localMeta.pending_token, ownerId)
  }

  try {
    const { session, error: sessionError } = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        data: localData,
        source: 'local',
        synced: false,
        reason: sessionError ? 'session-error' : 'no-session'
      }
    }
    if (userId !== ownerId) {
      return { data: localData, source: 'local', synced: false, reason: 'owner-changed' }
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('data,updated_at')
      .eq('user_id', userId)
      .eq('month_key', monthKey)
      .maybeSingle()

    if (error) throw error

    if (!data?.data) {
      return { data: localData, source: 'local', synced: false, reason: 'empty-cloud' }
    }

    const remoteUpdatedAt = data.updated_at || null
    const snapshot = normalizeSnapshot(data.data)

    if (!isRemoteNewerOrEqual(remoteUpdatedAt, localUpdatedAt)) {
      return {
        data: localData,
        source: 'local',
        synced: false,
        reason: 'local-newer',
        updated_at: localUpdatedAt
      }
    }

    writeLocalMonth(monthKey, snapshot, ownerId)
    writeMeta(monthKey, {
      source: 'cloud',
      cloud_updated_at: remoteUpdatedAt,
      local_updated_at: remoteUpdatedAt
    }, ownerId)

    return {
      data: snapshot,
      source: 'cloud',
      synced: true,
      updated_at: remoteUpdatedAt
    }
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] cloud read fallback:', err)
    return { data: localData, source: 'local', synced: false, reason: 'cloud-error', error: err }
  }
}

const saveMonthlyBudgetState = async (monthKey, data) => {
  const ownerId = getCurrentUserId()
  const snapshot = normalizeSnapshot(data)
  const localUpdatedAt = new Date().toISOString()
  const pendingToken = createPendingToken()
  writeLocalMonth(monthKey, snapshot, ownerId)
  writeMeta(monthKey, {
    source: 'local',
    local_updated_at: localUpdatedAt,
    pending_operation: 'upsert',
    pending_since: localUpdatedAt,
    pending_token: pendingToken
  }, ownerId)

  return pushMonthlyBudgetState(monthKey, snapshot, localUpdatedAt, pendingToken, ownerId)
}

const deleteMonthlyBudgetState = async (monthKey) => {
  const ownerId = getCurrentUserId()
  const storage = getStorageClient()
  if (storage) storage.removeItem(storageKey(monthKey, ownerId))
  removeMeta(monthKey, ownerId)

  if (!monthKey || !isOnline()) {
    return { deleted: true, source: 'local', synced: false, reason: 'offline' }
  }

  try {
    const { session, error: sessionError } = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        deleted: true,
        source: 'local',
        synced: false,
        reason: sessionError ? 'session-error' : 'no-session'
      }
    }
    if (userId !== ownerId) {
      return { deleted: true, source: 'local', synced: false, reason: 'owner-changed' }
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('user_id', userId)
      .eq('month_key', monthKey)

    if (error) throw error

    writeMeta(monthKey, {
      source: 'cloud',
      cloud_deleted_at: new Date().toISOString()
    }, ownerId)

    return { deleted: true, source: 'cloud', synced: true }
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] cloud delete fallback:', err)
    return { deleted: true, source: 'local', synced: false, reason: 'cloud-error', error: err }
  }
}

/**
 * Calculate current balance from budget data
 * @param {Object} budgetData - The budget snapshot with all fields
 * @returns {number} Current balance (revenues - expenses)
 */
const calculateBalance = (budgetData) => {
  if (!budgetData || typeof budgetData !== 'object') return 0
  return getBudgetSummary(budgetData).currentBalance
}

/**
 * Get current balance synchronously from localStorage (fallback for components)
 * @returns {number} Current balance or 0 if unable to calculate
 */
const getCurrentBalanceSync = (monthKey) => {
  try {
    const selectedMonth = monthKey || (typeof window !== 'undefined' && window.getMonth ? window.getMonth?.() : null)
    if (!selectedMonth) return 0

    const storage = getStorageClient()
    if (!storage) return 0

    const key = storageKey(selectedMonth)
    const raw = storage.getItem(key)
    const data = raw ? JSON.parse(raw) : {}

    return calculateBalance(data)
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] getCurrentBalanceSync failed:', err)
    return 0
  }
}

/**
 * Get current balance for the current month (if month is available)
 * @returns {number} Current balance or 0 if unable to calculate
 */
const getCurrentBalance = async (monthKey) => {
  try {
    const selectedMonth = monthKey || (typeof window !== 'undefined' && window.getMonth ? window.getMonth?.() : null)
    if (!selectedMonth) return 0

    const result = await getMonthlyBudgetState(selectedMonth)
    return calculateBalance(result?.data || {})
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] getCurrentBalance failed:', err)
    return 0
  }
}

const replayPendingChanges = () => {
  const ownerId = getCurrentUserId()
  const replayKey = ownerId || 'anonymous'
  if (pendingReplays.has(replayKey)) return pendingReplays.get(replayKey)
  const replay = (async () => {
    const results = {}
    for (const monthKey of getPendingMonthKeys(ownerId)) {
      const localData = readLocalMonth(monthKey, ownerId)
      const localMeta = readMeta(ownerId)[monthKey] || {}
      const localUpdatedAt = localMeta.local_updated_at || localMeta.cloud_updated_at || null
      results[monthKey] = await pushMonthlyBudgetState(monthKey, localData, localUpdatedAt, localMeta.pending_token, ownerId)
    }
    const pending = getPendingMonthKeys(ownerId)
    return {
      ok: Object.values(results).every(result => result?.synced),
      results,
      pending
    }
  })().finally(() => {
    pendingReplays.delete(replayKey)
  })
  pendingReplays.set(replayKey, replay)
  return replay
}

const attachOnlineReplay = () => {
  if (onlineReplayAttached || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  onlineReplayAttached = true
  window.addEventListener('online', () => {
    replayPendingChanges().catch((err) => {
      console.warn('[MonthlyBudgetStateService] pending replay failed:', err)
    })
  })
}

const init = async () => {
  attachOnlineReplay()
  return replayPendingChanges()
}

export const MonthlyBudgetStateService = {
  init,
  getLocalStorageKey: storageKey,
  getPendingMonthKeys,
  replayPendingChanges,
  getMonthlyBudgetState,
  saveMonthlyBudgetState,
  deleteMonthlyBudgetState,
  calculateBalance,
  getBudgetSummary,
  getCurrentBalance,
  getCurrentBalanceSync
}
