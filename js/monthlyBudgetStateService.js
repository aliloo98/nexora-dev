/**
 * Nexora - MonthlyBudgetStateService
 *
 * Source de verite V1 pour la synchronisation multi-appareils du budget mensuel.
 * Le snapshot JSON conserve toutes les cles historiques: montants, *_paye,
 * note_*, categories personnalisees et futures donnees du mois.
 */

import { supabase } from '../src/supabase.js'

const TABLE_NAME = 'monthly_budget_states'
const META_KEY = 'nexora_monthly_budget_states_meta_v1'

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine
const storageKey = (monthKey) => `budget_${monthKey}`

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

const readLocalMonth = (monthKey) => readJson(storageKey(monthKey), {})
const writeLocalMonth = (monthKey, data) => writeJson(storageKey(monthKey), data)

const readMeta = () => readJson(META_KEY, {})

const writeMeta = (monthKey, meta) => {
  const current = readMeta()
  current[monthKey] = {
    ...(current[monthKey] || {}),
    ...meta,
    cached_at: new Date().toISOString()
  }
  return writeJson(META_KEY, current)
}

const removeMeta = (monthKey) => {
  const current = readMeta()
  delete current[monthKey]
  return writeJson(META_KEY, current)
}

const getLocalUpdatedAt = (monthKey) => {
  const meta = readMeta()[monthKey] || {}
  return meta.local_updated_at || meta.cloud_updated_at || null
}

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

const getMonthlyBudgetState = async (monthKey) => {
  const localData = readLocalMonth(monthKey)
  const localUpdatedAt = getLocalUpdatedAt(monthKey)

  if (!monthKey || !isOnline()) {
    return { data: localData, source: 'local', synced: false }
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

    writeLocalMonth(monthKey, snapshot)
    writeMeta(monthKey, {
      source: 'cloud',
      cloud_updated_at: remoteUpdatedAt,
      local_updated_at: remoteUpdatedAt
    })

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
  const snapshot = normalizeSnapshot(data)
  writeLocalMonth(monthKey, snapshot)
  writeMeta(monthKey, {
    source: 'local',
    local_updated_at: new Date().toISOString()
  })

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

    const now = new Date().toISOString()
    const payload = {
      user_id: userId,
      month_key: monthKey,
      data: snapshot,
      updated_at: now
    }

    const { data: saved, error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: 'user_id,month_key' })
      .select('data,updated_at')
      .single()

    if (error) throw error

    const savedSnapshot = normalizeSnapshot(saved?.data || snapshot)
    writeLocalMonth(monthKey, savedSnapshot)
    writeMeta(monthKey, {
      source: 'cloud',
      cloud_updated_at: saved?.updated_at || now,
      local_updated_at: saved?.updated_at || now
    })

    return {
      data: savedSnapshot,
      source: 'cloud',
      synced: true,
      updated_at: saved?.updated_at || now
    }
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] cloud write fallback:', err)
    return { data: snapshot, source: 'local', synced: false, reason: 'cloud-error', error: err }
  }
}

const deleteMonthlyBudgetState = async (monthKey) => {
  const storage = getStorageClient()
  if (storage) storage.removeItem(storageKey(monthKey))
  removeMeta(monthKey)

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

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('user_id', userId)
      .eq('month_key', monthKey)

    if (error) throw error

    writeMeta(monthKey, {
      source: 'cloud',
      cloud_deleted_at: new Date().toISOString()
    })

    return { deleted: true, source: 'cloud', synced: true }
  } catch (err) {
    console.warn('[MonthlyBudgetStateService] cloud delete fallback:', err)
    return { deleted: true, source: 'local', synced: false, reason: 'cloud-error', error: err }
  }
}

export const MonthlyBudgetStateService = {
  getMonthlyBudgetState,
  saveMonthlyBudgetState,
  deleteMonthlyBudgetState
}
