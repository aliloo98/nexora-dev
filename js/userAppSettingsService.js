import { StorageManager } from './storage.js'

const META_SUFFIX = '::meta'

const DEFAULT_KEYS = [
  'nexora_goals_v1',
  'nexora_monthly_history_snapshots_v1',
  'nexora_budget_cycle_settings_v1',
  'nexora_csv_learning_v1',
  'nexora_csv_import_drafts_v1'
]

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
const traceGoalsStartup = (event, patch = {}) => {
  if (typeof window !== 'undefined' && window.nexoraTraceGoalsStartup) {
    window.nexoraTraceGoalsStartup(event, patch)
  }
}

const getLocalItem = async (key) => {
  const storageRaw = await StorageManager.getItem(key)
  let safeRaw = null
  if (typeof SafeStorage !== 'undefined') {
    safeRaw = SafeStorage.getItem(key)
  }

  if (storageRaw === null || storageRaw === undefined) return safeRaw
  if (safeRaw === null || safeRaw === undefined) return storageRaw

  const storageValue = parseJson(storageRaw)
  const safeValue = parseJson(safeRaw)
  if (isEmptyArray(storageValue) && isNonEmptyArray(safeValue)) return safeRaw

  return storageRaw
}

const setLocalItem = async (key, value) => {
  await StorageManager.setItem(key, value)
  if (typeof SafeStorage !== 'undefined') {
    try {
      SafeStorage.setItem(key, value)
    } catch (err) {
      // Keep going even if SafeStorage is unavailable
    }
  }
  if (typeof window !== 'undefined' && window.SafeStorage) {
    try {
      window.SafeStorage.setItem(key, value)
    } catch {
      // Keep going even if window.SafeStorage is unavailable
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Keep going even if localStorage is unavailable
    }
  }
}

const forceWriteLocalSetting = async (key, value, updatedAt) => {
  const serialized = JSON.stringify(value)
  if (key === 'nexora_goals_v1') {
    traceGoalsStartup('settings:forceWriteLocalSetting:start', { localGoalsCount: Array.isArray(value) ? value.length : null })
  }
  await setLocalItem(key, serialized)
  if (updatedAt) {
    await setLocalItem(key + META_SUFFIX, JSON.stringify({ updated_at: updatedAt }))
  }
  const setting = await UserAppSettingsService.getSetting(key)
  if (key === 'nexora_goals_v1') {
    traceGoalsStartup('settings:forceWriteLocalSetting:finish', { localGoalsCount: Array.isArray(setting.value) ? setting.value.length : null })
  }
  return setting
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

const UserAppSettingsService = {
  log: (message, data) => {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[UserAppSettingsService]', message, data || '')
    }
  },

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
    if (key === 'nexora_goals_v1') {
      traceGoalsStartup('settings:getSetting:goals', { localGoalsCount: Array.isArray(value) ? value.length : null })
    }
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
    if (!window.supabase || !window.supabase.auth) {
      UserAppSettingsService.log('Supabase not available, skipping cloud sync for', key)
      return { ok: false, reason: 'no-supabase' }
    }
    const sessionResp = await window.supabase.auth.getSession().catch((err) => {
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
      const result = await window.supabase
        .from('user_app_settings')
        .upsert(payload, { onConflict: 'user_id,key', returning: 'minimal' })
      const { error } = result
      if (error) {
        UserAppSettingsService.warn('Failed to upsert cloud setting', { key, error })
        return { ok: false, error }
      }
      return { ok: true }
    } catch (err) {
      UserAppSettingsService.warn('Supabase upsert failed', { key, err })
      return { ok: false, error: err }
    }
  },

  // Pull cloud row and merge to local using last-write-wins on updated_at
  syncCloudSettingToLocal: async (key) => {
    if (key === 'nexora_goals_v1') {
      traceGoalsStartup('settings:syncCloudSettingToLocal:start', { syncStarted: true, syncFinished: false })
    }
    if (!window.supabase || !window.supabase.auth) {
      UserAppSettingsService.log('Supabase not available, skipping cloud pull for', key)
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:syncCloudSettingToLocal:no-supabase', { syncFinished: true })
      }
      return { ok: false, reason: 'no-supabase' }
    }
    const sessionResp = await window.supabase.auth.getSession().catch((err) => {
      UserAppSettingsService.log('Failed to get Supabase session', err)
      return null
    })
    const userId = sessionResp?.data?.session?.user?.id
    if (!userId) {
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:syncCloudSettingToLocal:no-user', { syncFinished: true })
      }
      return { ok: false, reason: 'no-user' }
    }
    if (key === 'nexora_goals_v1') {
      traceGoalsStartup('settings:cloudRead:user', { userId })
    }

    const { data: row, error } = await window.supabase.from('user_app_settings').select('*').eq('user_id', userId).eq('key', key).single().catch((err) => {
      UserAppSettingsService.log('Supabase select failed', { key, err })
      return { data: null, error: err }
    })
    if (error) {
      const reason = error?.code === 'PGRST102' || error?.message?.includes('No rows') ? 'no-cloud' : 'cloud-error'
      if (reason === 'no-cloud') {
        UserAppSettingsService.log('No cloud row found for key', key)
      } else {
        UserAppSettingsService.warn('Cloud query error for key', { key, error })
      }
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:cloudRead:error', { syncFinished: true, error: error?.message || String(error) })
      }
      return { ok: false, reason, error }
    }
    if (!row) {
      UserAppSettingsService.log('No cloud row found for key', key)
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:cloudRead:no-row', { syncFinished: true, cloudGoalsCount: null })
      }
      return { ok: false, reason: 'no-cloud' }
    }

    const cloudUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0
    const { value: localValue, meta: localMeta } = await UserAppSettingsService.getSetting(key)
    const localUpdated = localMeta && localMeta.updated_at ? new Date(localMeta.updated_at).getTime() : 0
    const cloudValue = row.data
    if (key === 'nexora_goals_v1') {
      traceGoalsStartup('settings:cloudRead:success', {
        cloudGoalsCount: Array.isArray(cloudValue) ? cloudValue.length : null,
        localGoalsCount: Array.isArray(localValue) ? localValue.length : null
      })
    }

    if (key === 'nexora_goals_v1' && isNonEmptyArray(cloudValue) && !isNonEmptyArray(localValue)) {
      await forceWriteLocalSetting(key, cloudValue, row.updated_at)
      await refreshGoalsUiAfterCloudMerge()
      UserAppSettingsService.log('Injected non-empty cloud goals into local storage', key)
      traceGoalsStartup('settings:syncCloudSettingToLocal:finish', { syncFinished: true, localGoalsCount: cloudValue.length })
      return { ok: true, action: 'cloud-to-local-goals-forced' }
    }

    if (isEmptyArray(cloudValue) && isNonEmptyArray(localValue)) {
      const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
      if (!pushResult.ok) {
        UserAppSettingsService.warn('Failed to protect non-empty local setting from empty cloud', { key, pushResult })
        return { ok: false, error: pushResult.error, reason: pushResult.reason }
      }
      UserAppSettingsService.log('Local non-empty setting kept over empty cloud', key)
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:syncCloudSettingToLocal:finish', { syncFinished: true })
      }
      return { ok: true, action: 'local-to-cloud-empty-cloud-protected' }
    }

    if (!localValue && cloudValue) {
      // no local, cloud present -> write cloud to local
      await forceWriteLocalSetting(key, cloudValue, row.updated_at)
      if (key === 'nexora_goals_v1') {
        await refreshGoalsUiAfterCloudMerge()
      }
      UserAppSettingsService.log('Pulled cloud setting to local', key)
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:syncCloudSettingToLocal:finish', { syncFinished: true, localGoalsCount: Array.isArray(cloudValue) ? cloudValue.length : null })
      }
      return { ok: true, action: 'cloud-to-local' }
    }

    if (cloudUpdated > localUpdated) {
      // cloud newer -> replace local
      await forceWriteLocalSetting(key, cloudValue, row.updated_at)
      if (key === 'nexora_goals_v1') {
        await refreshGoalsUiAfterCloudMerge()
      }
      UserAppSettingsService.log('Cloud setting is newer; updated local value', key)
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:syncCloudSettingToLocal:finish', { syncFinished: true, localGoalsCount: Array.isArray(cloudValue) ? cloudValue.length : null })
      }
      return { ok: true, action: 'cloud-to-local' }
    }

    if (localUpdated > cloudUpdated) {
      // local newer -> push to cloud
      const pushResult = await UserAppSettingsService.syncLocalSettingToCloud(key)
      if (!pushResult.ok) {
        UserAppSettingsService.warn('Failed to push newer local setting to cloud', { key, pushResult })
        return { ok: false, error: pushResult.error }
      }
      UserAppSettingsService.log('Local setting is newer; pushed to cloud', key)
      if (key === 'nexora_goals_v1') {
        traceGoalsStartup('settings:syncCloudSettingToLocal:finish', { syncFinished: true })
      }
      return { ok: true, action: 'local-to-cloud' }
    }

    UserAppSettingsService.log('No sync action needed; local and cloud timestamps equal', key)
    if (key === 'nexora_goals_v1') {
      traceGoalsStartup('settings:syncCloudSettingToLocal:finish', { syncFinished: true })
    }
    return { ok: true, action: 'noop' }
  },

  syncAllAppSettings: async (keys = DEFAULT_KEYS) => {
    traceGoalsStartup('settings:syncAllAppSettings:start', { syncStarted: true, syncFinished: false })
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
    traceGoalsStartup('settings:syncAllAppSettings:finish', { syncFinished: true })
    return results
  }
}

export { UserAppSettingsService }
