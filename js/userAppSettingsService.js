import { StorageManager } from './storage.js'
import { STORAGE_KEYS, SYNCED_APP_SETTING_KEYS } from '../src/constants/storageKeys.js'
import { getNamespacedStorageKey } from './userStorage.js'
import { logSyncEvent } from '../src/sync/syncDiagnostics.js'
import {
  mergeRecurringIncomeArrays,
  normalizeRecurringIncomeList
} from '../src/settings/recurringIncomeSync.js'
import {
  applyArrayTombstones,
  createArraySyncEnvelope,
  decodeArraySyncEnvelope,
  getArrayItemIdentity,
  getArrayItemTimestamp,
  isStrictIdentitySubset,
  mergeArrayTombstones,
  normalizeArrayTombstones,
  recordArrayDeletions
} from '../src/sync/arrayTombstones.js'

const META_SUFFIX = '::meta'

const DEFAULT_KEYS = SYNCED_APP_SETTING_KEYS

const parseJson = (raw) => {
  if (raw === null || raw === undefined) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const isEmptyArray = (value) => Array.isArray(value) && value.length === 0
const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0

const mergeArrayByIdentity = (localValue = [], cloudValue = []) => {
  const conflicts = []
  const merged = new Map()
  const add = (item, source, index) => {
    const identity = getArrayItemIdentity(item, index)
    const existing = merged.get(identity)
    if (!existing) {
      merged.set(identity, { item, source })
      return
    }

    const existingTime = getArrayItemTimestamp(existing.item)
    const incomingTime = getArrayItemTimestamp(item)
    if (incomingTime > existingTime) {
      conflicts.push({ identity, kept: source, replaced: existing.source })
      merged.set(identity, { item, source })
      return
    }
    if (incomingTime === existingTime && JSON.stringify(existing.item) !== JSON.stringify(item)) {
      conflicts.push({ identity, kept: existing.source, replaced: source, reason: 'same-timestamp' })
    }
  }

  localValue.forEach((item, index) => add(item, 'local', index))
  cloudValue.forEach((item, index) => add(item, 'cloud', index))
  return {
    value: Array.from(merged.values()).map(entry => entry.item),
    conflicts
  }
}

const appendConflictLog = async (key, conflicts = []) => {
  if (!conflicts.length) return
  const { value } = await UserAppSettingsService.getSetting(STORAGE_KEYS.syncConflictLog)
  const current = Array.isArray(value) ? value : []
  const entries = conflicts.map(conflict => ({
    key,
    ...conflict,
    at: new Date().toISOString()
  }))
  await forceWriteLocalSetting(STORAGE_KEYS.syncConflictLog, current.concat(entries).slice(-100), new Date().toISOString())
}

const getLocalItem = async (key) => {
  const namespacedKey = getNamespacedStorageKey(key)
  const storageRaw = await StorageManager.getItem(namespacedKey)
  let safeRaw = null
  if (typeof SafeStorage !== 'undefined') {
    safeRaw = SafeStorage.getItem(namespacedKey)
  }

  if (storageRaw === null || storageRaw === undefined) return safeRaw
  if (safeRaw === null || safeRaw === undefined) return storageRaw

  const storageValue = parseJson(storageRaw)
  const safeValue = parseJson(safeRaw)
  if (isEmptyArray(storageValue) && isNonEmptyArray(safeValue)) return safeRaw

  return storageRaw
}

const setLocalItem = async (key, value) => {
  const namespacedKey = getNamespacedStorageKey(key)
  await StorageManager.setItem(namespacedKey, value)
  if (typeof SafeStorage !== 'undefined') {
    try {
      SafeStorage.setItem(namespacedKey, value)
    } catch (err) {
      // Keep going even if SafeStorage is unavailable
    }
  }
  if (typeof window !== 'undefined' && window.SafeStorage) {
    try {
      window.SafeStorage.setItem(namespacedKey, value)
    } catch {
      // Keep going even if window.SafeStorage is unavailable
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(namespacedKey, value)
    } catch {
      // Keep going even if localStorage is unavailable
    }
  }
}

const forceWriteLocalSetting = async (key, value, updatedAt, tombstones) => {
  const serialized = JSON.stringify(value)
  await setLocalItem(key, serialized)
  if (updatedAt) {
    const meta = { updated_at: updatedAt }
    if (Array.isArray(tombstones)) meta.tombstones = normalizeArrayTombstones(tombstones)
    await setLocalItem(key + META_SUFFIX, JSON.stringify(meta))
  }
  return UserAppSettingsService.getSetting(key)
}

const refreshGoalsUiAfterCloudMerge = async () => {
  if (typeof window === 'undefined') return
  try {
    if (window.GoalsPage?.render) await window.GoalsPage.render()
    if (window.GoalsPage?.renderAnalytics) await window.GoalsPage.renderAnalytics()
  } catch (err) {
    UserAppSettingsService.warn('Failed to refresh goals UI after cloud merge', err)
  }
}

const refreshBudgetCycleUiAfterCloudMerge = async () => {
  if (typeof window === 'undefined') return
  try {
    if (typeof window.refreshBudgetCycleSettingsUI === 'function') {
      window.refreshBudgetCycleSettingsUI()
    }
    if (typeof window.updateAll === 'function') {
      window.updateAll()
    }
  } catch (err) {
    UserAppSettingsService.warn('Failed to refresh budget cycle UI after cloud merge', err)
  }
}

const refreshRecurringIncomesUiAfterCloudMerge = async () => {
  if (typeof window === 'undefined') return
  try {
    if (typeof window.renderRecurringIncomeSettings === 'function') {
      await window.renderRecurringIncomeSettings()
    }
  } catch (err) {
    UserAppSettingsService.warn('Failed to refresh recurring incomes UI after cloud merge', err)
  }
}

const normalizeSyncedArrayValue = (key, value) => {
  if (!Array.isArray(value)) return value
  if (key === STORAGE_KEYS.recurringIncomes) {
    return normalizeRecurringIncomeList(value)
  }
  return value
}

const mergeSyncedArrayValue = (key, localValue, cloudValue) => {
  if (key === STORAGE_KEYS.recurringIncomes) {
    return mergeRecurringIncomeArrays(localValue, cloudValue)
  }
  return mergeArrayByIdentity(localValue, cloudValue)
}

const UserAppSettingsService = {
  log: () => {},

  getLocalStorageKey: getNamespacedStorageKey,

  warn: (message, data) => {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[UserAppSettingsService]', message, data || '')
    }
  },

  init: async () => {
    await StorageManager.initIndexedDB()
  },

  getSetting: async (key) => {
    const raw = await getLocalItem(key)
    const metaRaw = await getLocalItem(key + META_SUFFIX)
    const value = parseJson(raw)
    const meta = parseJson(metaRaw)
    return { value, meta }
  },

  saveSetting: async (key, value) => {
    const { value: previousValue, meta: previousMeta } = await UserAppSettingsService.getSetting(key)
    const updated_at = new Date().toISOString()
    const tombstones = Array.isArray(value)
      ? recordArrayDeletions({
          previousItems: Array.isArray(previousValue) ? previousValue : [],
          nextItems: value,
          tombstones: previousMeta?.tombstones,
          updatedAt: updated_at
        })
      : null
    const serialized = JSON.stringify(value)
    await setLocalItem(key, serialized)
    const meta = Array.isArray(value) ? { updated_at, tombstones } : { updated_at }
    await setLocalItem(key + META_SUFFIX, JSON.stringify(meta))
    return meta
  },

  // Push local value to Supabase user_app_settings row
  syncLocalSettingToCloud: async (key) => {
    const runtime = typeof window !== 'undefined' ? window : globalThis
    if (!runtime.supabase || !runtime.supabase.auth) {
      UserAppSettingsService.log('Supabase not available, skipping cloud sync for', key)
      return { ok: false, reason: 'no-supabase' }
    }
    const sessionResp = await runtime.supabase.auth.getSession().catch((err) => {
      UserAppSettingsService.log('Failed to get Supabase session', err)
      return null
    })
    const userId = sessionResp?.data?.session?.user?.id
    if (!userId) return { ok: false, reason: 'no-user' }

    const { value, meta } = await UserAppSettingsService.getSetting(key)
    if (value === null) {
      UserAppSettingsService.log('No local value for key', key)
      return { ok: false, reason: 'no-local' }
    }
    const data = Array.isArray(value)
      ? createArraySyncEnvelope(
          applyArrayTombstones(value, meta?.tombstones, { fallbackUpdatedAt: meta?.updated_at }),
          meta?.tombstones
        )
      : value
    const payload = { user_id: userId, key, data }
    if (Array.isArray(value)) payload.data_version = 2
    if (meta && meta.updated_at) payload.updated_at = meta.updated_at

    try {
      const result = await runtime.supabase
        .from('user_app_settings')
        .upsert(payload, { onConflict: 'user_id,key', returning: 'minimal' })
      const { error } = result
      if (error) {
        UserAppSettingsService.warn('Failed to upsert cloud setting', { key, error })
        logSyncEvent('push', key, { ok: false, error: error?.message })
        return { ok: false, error }
      }
      logSyncEvent('push', key, { ok: true })
      return { ok: true }
    } catch (err) {
      UserAppSettingsService.warn('Supabase upsert failed', { key, err })
      return { ok: false, error: err }
    }
  },

  // Pull cloud row and merge to local using last-write-wins on updated_at
  syncCloudSettingToLocal: async (key) => {
    const runtime = typeof window !== 'undefined' ? window : globalThis
    if (!runtime.supabase || !runtime.supabase.auth) {
      UserAppSettingsService.log('Supabase not available, skipping cloud pull for', key)
      return { ok: false, reason: 'no-supabase' }
    }
    const sessionResp = await runtime.supabase.auth.getSession().catch((err) => {
      UserAppSettingsService.log('Failed to get Supabase session', err)
      return null
    })
    const userId = sessionResp?.data?.session?.user?.id
    if (!userId) {
      return { ok: false, reason: 'no-user' }
    }

    let row = null
    let error = null
    try {
      const result = await runtime.supabase
        .from('user_app_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle()
      row = result.data
      error = result.error
    } catch (err) {
      UserAppSettingsService.log('Supabase select failed', { key, err })
      error = err
    }
    if (error) {
      const reason = error?.code === 'PGRST102' || error?.message?.includes('No rows') ? 'no-cloud' : 'cloud-error'
      if (reason === 'no-cloud') {
        UserAppSettingsService.log('No cloud row found for key', key)
      } else {
        UserAppSettingsService.warn('Cloud query error for key', { key, error })
      }
      return { ok: false, reason, error }
    }
    if (!row) {
      UserAppSettingsService.log('No cloud row found for key', key)
      return { ok: false, reason: 'no-cloud' }
    }

    const cloudUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0
    const { value: rawLocalValue, meta: localMeta } = await UserAppSettingsService.getSetting(key)
    const localUpdated = localMeta && localMeta.updated_at ? new Date(localMeta.updated_at).getTime() : 0
    const decodedCloudValue = decodeArraySyncEnvelope(row.data)
    const isArraySync = decodedCloudValue.isEnvelope || Array.isArray(row.data)
    const mergedTombstones = isArraySync
      ? mergeArrayTombstones(localMeta?.tombstones, decodedCloudValue.tombstones)
      : undefined
    const localValue = isArraySync && Array.isArray(rawLocalValue)
      ? applyArrayTombstones(rawLocalValue, mergedTombstones, { fallbackUpdatedAt: localMeta?.updated_at })
      : rawLocalValue
    const cloudValue = isArraySync
      ? applyArrayTombstones(decodedCloudValue.items, mergedTombstones, { fallbackUpdatedAt: row.updated_at })
      : row.data
    const localArrayStateChanged = isArraySync && (
      JSON.stringify(localValue) !== JSON.stringify(rawLocalValue) ||
      JSON.stringify(normalizeArrayTombstones(localMeta?.tombstones)) !== JSON.stringify(mergedTombstones)
    )
    const cloudArrayStateChanged = isArraySync && (
      JSON.stringify(cloudValue) !== JSON.stringify(decodedCloudValue.items) ||
      JSON.stringify(decodedCloudValue.tombstones) !== JSON.stringify(mergedTombstones)
    )

    const hasEmptyArrayConflict = (
      isEmptyArray(localValue) && isNonEmptyArray(cloudValue)
    ) || (
      isNonEmptyArray(localValue) && isEmptyArray(cloudValue)
    )

    if (hasEmptyArrayConflict) {
      if (localUpdated > cloudUpdated) {
        if (localArrayStateChanged) {
          await forceWriteLocalSetting(key, localValue, localMeta?.updated_at || new Date().toISOString(), mergedTombstones)
        }
        const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
        if (!pushResult.ok) {
          UserAppSettingsService.warn('Failed to push newer local array state', { key, pushResult })
          return { ok: false, error: pushResult.error, reason: pushResult.reason }
        }
        UserAppSettingsService.log('Newer local array state pushed to cloud', key)
        logSyncEvent('pull', key, { ok: true, action: 'local-to-cloud-empty-conflict' })
        return { ok: true, action: 'local-to-cloud-empty-conflict' }
      }

      await forceWriteLocalSetting(key, normalizeSyncedArrayValue(key, cloudValue), row.updated_at, mergedTombstones)
      if (cloudArrayStateChanged) {
        const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
        if (!pushResult.ok) UserAppSettingsService.warn('Failed to converge cloud array deletion metadata', { key, pushResult })
      }
      if (key === STORAGE_KEYS.goals) await refreshGoalsUiAfterCloudMerge()
      if (key === STORAGE_KEYS.budgetCycleSettings) await refreshBudgetCycleUiAfterCloudMerge()
      if (key === STORAGE_KEYS.recurringIncomes) await refreshRecurringIncomesUiAfterCloudMerge()
      UserAppSettingsService.log('Newer cloud array state written locally', key)
      logSyncEvent('pull', key, { ok: true, action: 'cloud-to-local-empty-conflict' })
      return { ok: true, action: 'cloud-to-local-empty-conflict' }
    }

    if (isNonEmptyArray(localValue) && isNonEmptyArray(cloudValue)) {
      if (localUpdated > cloudUpdated && isStrictIdentitySubset(localValue, cloudValue)) {
        if (localArrayStateChanged) {
          await forceWriteLocalSetting(key, localValue, localMeta?.updated_at || new Date().toISOString(), mergedTombstones)
        }
        const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
        if (!pushResult.ok) {
          UserAppSettingsService.warn('Failed to push newer partial local deletion', { key, pushResult })
          return { ok: false, error: pushResult.error, reason: pushResult.reason }
        }
        UserAppSettingsService.log('Newer partial local deletion pushed to cloud', key)
        logSyncEvent('pull', key, { ok: true, action: 'local-to-cloud-subset-deletion' })
        return { ok: true, action: 'local-to-cloud-subset-deletion' }
      }

      if (cloudUpdated > localUpdated && isStrictIdentitySubset(cloudValue, localValue)) {
        await forceWriteLocalSetting(key, normalizeSyncedArrayValue(key, cloudValue), row.updated_at, mergedTombstones)
        if (cloudArrayStateChanged) {
          const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
          if (!pushResult.ok) UserAppSettingsService.warn('Failed to converge cloud partial deletion metadata', { key, pushResult })
        }
        if (key === STORAGE_KEYS.goals) await refreshGoalsUiAfterCloudMerge()
        if (key === STORAGE_KEYS.budgetCycleSettings) await refreshBudgetCycleUiAfterCloudMerge()
        if (key === STORAGE_KEYS.recurringIncomes) await refreshRecurringIncomesUiAfterCloudMerge()
        UserAppSettingsService.log('Newer partial cloud deletion written locally', key)
        logSyncEvent('pull', key, { ok: true, action: 'cloud-to-local-subset-deletion' })
        return { ok: true, action: 'cloud-to-local-subset-deletion' }
      }

      const merged = mergeSyncedArrayValue(key, localValue, cloudValue)
      const normalizedMerged = normalizeSyncedArrayValue(key, merged.value)
      if (JSON.stringify(normalizedMerged) !== JSON.stringify(localValue) || merged.conflicts.length) {
        const newest = cloudUpdated > localUpdated ? row.updated_at : localMeta?.updated_at
        await forceWriteLocalSetting(key, normalizedMerged, newest || new Date().toISOString(), mergedTombstones)
        await appendConflictLog(key, merged.conflicts)
        await UserAppSettingsService.syncLocalSettingToCloud(key)
        if (key === STORAGE_KEYS.goals) await refreshGoalsUiAfterCloudMerge()
        if (key === STORAGE_KEYS.budgetCycleSettings) await refreshBudgetCycleUiAfterCloudMerge()
        if (key === STORAGE_KEYS.recurringIncomes) await refreshRecurringIncomesUiAfterCloudMerge()
        UserAppSettingsService.log('Merged local/cloud array setting by identity', key)
        return { ok: true, action: 'merged-array', conflicts: merged.conflicts.length }
      }
    }

    if (!localValue && cloudValue) {
      // no local, cloud present -> write cloud to local
      await forceWriteLocalSetting(key, normalizeSyncedArrayValue(key, cloudValue), row.updated_at, mergedTombstones)
      if (key === STORAGE_KEYS.goals) {
        await refreshGoalsUiAfterCloudMerge()
      }
      if (key === STORAGE_KEYS.budgetCycleSettings) {
        await refreshBudgetCycleUiAfterCloudMerge()
      }
      if (key === STORAGE_KEYS.recurringIncomes) {
        await refreshRecurringIncomesUiAfterCloudMerge()
      }
      UserAppSettingsService.log('Pulled cloud setting to local', key)
      logSyncEvent('pull', key, { ok: true, action: 'cloud-to-local' })
      return { ok: true, action: 'cloud-to-local' }
    }

    if (cloudUpdated > localUpdated) {
      // cloud newer -> replace local
      await forceWriteLocalSetting(key, normalizeSyncedArrayValue(key, cloudValue), row.updated_at, mergedTombstones)
      if (cloudArrayStateChanged) {
        const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
        if (!pushResult.ok) UserAppSettingsService.warn('Failed to converge newer cloud array metadata', { key, pushResult })
      }
      if (key === STORAGE_KEYS.goals) {
        await refreshGoalsUiAfterCloudMerge()
      }
      if (key === STORAGE_KEYS.budgetCycleSettings) {
        await refreshBudgetCycleUiAfterCloudMerge()
      }
      if (key === STORAGE_KEYS.recurringIncomes) {
        await refreshRecurringIncomesUiAfterCloudMerge()
      }
      UserAppSettingsService.log('Cloud setting is newer; updated local value', key)
      logSyncEvent('pull', key, { ok: true, action: 'cloud-to-local-newer' })
      return { ok: true, action: 'cloud-to-local' }
    }

    if (localUpdated > cloudUpdated) {
      // local newer -> push to cloud
      if (localArrayStateChanged) {
        await forceWriteLocalSetting(key, localValue, localMeta?.updated_at || new Date().toISOString(), mergedTombstones)
      }
      const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
      if (!pushResult.ok) {
        UserAppSettingsService.warn('Failed to push newer local setting to cloud', { key, pushResult })
        logSyncEvent('pull', key, { ok: false, action: 'local-to-cloud-failed' })
        return { ok: false, error: pushResult.error }
      }
      UserAppSettingsService.log('Local setting is newer; pushed to cloud', key)
      logSyncEvent('pull', key, { ok: true, action: 'local-to-cloud' })
      return { ok: true, action: 'local-to-cloud' }
    }

    if (isArraySync && (localArrayStateChanged || cloudArrayStateChanged)) {
      if (localArrayStateChanged) {
        await forceWriteLocalSetting(key, localValue, localMeta?.updated_at || row.updated_at || new Date().toISOString(), mergedTombstones)
      }
      if (cloudArrayStateChanged) {
        const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
        if (!pushResult.ok) {
          UserAppSettingsService.warn('Failed to converge equal-timestamp array metadata', { key, pushResult })
          return { ok: false, error: pushResult.error, reason: pushResult.reason }
        }
      }
      logSyncEvent('pull', key, { ok: true, action: 'merged-array-metadata' })
      return { ok: true, action: 'merged-array-metadata' }
    }

    UserAppSettingsService.log('No sync action needed; local and cloud timestamps equal', key)
    logSyncEvent('pull', key, { ok: true, action: 'noop' })
    return { ok: true, action: 'noop' }
  },

  syncAllAppSettings: async (keys = DEFAULT_KEYS) => {
    await UserAppSettingsService.init()
    const results = {}
    for (const key of keys) {
      try {
        const res = await UserAppSettingsService.syncCloudSettingToLocal(key)
        // if cloud missing but local exists, sync local -> cloud
        if (res && res.reason === 'no-cloud') {
          const { value } = await UserAppSettingsService.getSetting(key)
          if (value !== null) {
            const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
            if (pushResult.ok) {
              results[key] = { ok: true, action: 'local-pushed' }
            } else {
              results[key] = { ok: false, error: pushResult.error, reason: pushResult.reason }
            }
            continue
          }
        }
        results[key] = res
      } catch (e) {
        results[key] = { ok: false, error: e }
      }
    }
    return results
  }
}

export { UserAppSettingsService }
