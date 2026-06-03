import { StorageManager } from './storage.js'
import { STORAGE_KEYS, SYNCED_APP_SETTING_KEYS } from '../src/constants/storageKeys.js'
import { getNamespacedStorageKey } from './userStorage.js'
import { logSyncEvent } from '../src/sync/syncDiagnostics.js'

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

const itemTimestamp = (item) => {
  const value = item?.updated_at || item?.updatedAt || item?.modified_at || item?.created_at || item?.createdAt || 0
  const time = value ? new Date(value).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

const identityForItem = (item, index) => {
  if (!item || typeof item !== 'object') return `primitive:${String(item)}:${index}`
  const id = item.id || item.local_id || item.key || item.categoryKey
  if (id) return `id:${String(id).toLowerCase()}`
  const name = item.name || item.title || item.label
  const type = item.type || item.frequency || item.priority || ''
  if (name) return `name:${String(name).trim().toLowerCase()}::${String(type).trim().toLowerCase()}`
  return `index:${index}`
}

const mergeArrayByIdentity = (localValue = [], cloudValue = []) => {
  const conflicts = []
  const merged = new Map()
  const add = (item, source, index) => {
    const identity = identityForItem(item, index)
    const existing = merged.get(identity)
    if (!existing) {
      merged.set(identity, { item, source })
      return
    }

    const existingTime = itemTimestamp(existing.item)
    const incomingTime = itemTimestamp(item)
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
  if (DEFAULT_KEYS.includes(key) && namespacedKey !== key) {
    try {
      await StorageManager.setItem(key, value)
      if (typeof SafeStorage !== 'undefined') SafeStorage.setItem(key, value)
      if (typeof window !== 'undefined' && window.SafeStorage) window.SafeStorage.setItem(key, value)
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value)
    } catch {
      // Legacy mirrors are best effort only; the namespaced key remains authoritative.
    }
  }
}

const forceWriteLocalSetting = async (key, value, updatedAt) => {
  const serialized = JSON.stringify(value)
  await setLocalItem(key, serialized)
  if (updatedAt) {
    await setLocalItem(key + META_SUFFIX, JSON.stringify({ updated_at: updatedAt }))
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

const UserAppSettingsService = {
  log: () => {},

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
    const serialized = JSON.stringify(value)
    await setLocalItem(key, serialized)
    const updated_at = new Date().toISOString()
    await setLocalItem(key + META_SUFFIX, JSON.stringify({ updated_at }))
    return { updated_at }
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
    const payload = { user_id: userId, key, data: value }
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
    const { value: localValue, meta: localMeta } = await UserAppSettingsService.getSetting(key)
    const localUpdated = localMeta && localMeta.updated_at ? new Date(localMeta.updated_at).getTime() : 0
    const cloudValue = row.data

    if (key === STORAGE_KEYS.goals && isNonEmptyArray(cloudValue) && !isNonEmptyArray(localValue)) {
      await forceWriteLocalSetting(key, cloudValue, row.updated_at)
      await refreshGoalsUiAfterCloudMerge()
      UserAppSettingsService.log('Injected non-empty cloud goals into local storage', key)
      return { ok: true, action: 'cloud-to-local-goals-forced' }
    }

    if (isEmptyArray(cloudValue) && isNonEmptyArray(localValue)) {
      const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
      if (!pushResult.ok) {
        UserAppSettingsService.warn('Failed to protect non-empty local setting from empty cloud', { key, pushResult })
        return { ok: false, error: pushResult.error, reason: pushResult.reason }
      }
      UserAppSettingsService.log('Local non-empty setting kept over empty cloud', key)
      return { ok: true, action: 'local-to-cloud-empty-cloud-protected' }
    }

    if (isNonEmptyArray(localValue) && isNonEmptyArray(cloudValue)) {
      const merged = mergeArrayByIdentity(localValue, cloudValue)
      if (JSON.stringify(merged.value) !== JSON.stringify(localValue) || merged.conflicts.length) {
        const newest = cloudUpdated > localUpdated ? row.updated_at : localMeta?.updated_at
        await forceWriteLocalSetting(key, merged.value, newest || new Date().toISOString())
        await appendConflictLog(key, merged.conflicts)
        await UserAppSettingsService.syncLocalSettingToCloud(key)
        if (key === STORAGE_KEYS.goals) await refreshGoalsUiAfterCloudMerge()
        if (key === STORAGE_KEYS.budgetCycleSettings) await refreshBudgetCycleUiAfterCloudMerge()
        UserAppSettingsService.log('Merged local/cloud array setting by identity', key)
        return { ok: true, action: 'merged-array', conflicts: merged.conflicts.length }
      }
    }

    if (!localValue && cloudValue) {
      // no local, cloud present -> write cloud to local
      await forceWriteLocalSetting(key, cloudValue, row.updated_at)
      if (key === STORAGE_KEYS.goals) {
        await refreshGoalsUiAfterCloudMerge()
      }
      if (key === STORAGE_KEYS.budgetCycleSettings) {
        await refreshBudgetCycleUiAfterCloudMerge()
      }
      UserAppSettingsService.log('Pulled cloud setting to local', key)
      logSyncEvent('pull', key, { ok: true, action: 'cloud-to-local' })
      return { ok: true, action: 'cloud-to-local' }
    }

    if (cloudUpdated > localUpdated) {
      // cloud newer -> replace local
      await forceWriteLocalSetting(key, cloudValue, row.updated_at)
      if (key === STORAGE_KEYS.goals) {
        await refreshGoalsUiAfterCloudMerge()
      }
      if (key === STORAGE_KEYS.budgetCycleSettings) {
        await refreshBudgetCycleUiAfterCloudMerge()
      }
      UserAppSettingsService.log('Cloud setting is newer; updated local value', key)
      logSyncEvent('pull', key, { ok: true, action: 'cloud-to-local-newer' })
      return { ok: true, action: 'cloud-to-local' }
    }

    if (localUpdated > cloudUpdated) {
      // local newer -> push to cloud
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
