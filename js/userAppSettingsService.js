import { StorageManager } from './storage.js'

const META_SUFFIX = '::meta'

const DEFAULT_KEYS = [
  'nexora_goals_v1',
  'nexora_monthly_history_snapshots_v1',
  'nexora_budget_cycle_settings_v1',
  'nexora_csv_learning_v1',
  'nexora_csv_import_drafts_v1'
]

const getLocalItem = async (key) => {
  let raw = await StorageManager.getItem(key)
  if ((raw === null || raw === undefined) && typeof SafeStorage !== 'undefined') {
    raw = SafeStorage.getItem(key)
  }
  return raw
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
    let value = null
    let meta = null
    try { value = raw ? JSON.parse(raw) : null } catch (e) { value = null }
    try { meta = metaRaw ? JSON.parse(metaRaw) : null } catch (e) { meta = null }
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
      const { error } = await window.supabase.from('user_app_settings').upsert([payload], { returning: 'minimal' })
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
    if (!window.supabase || !window.supabase.auth) {
      UserAppSettingsService.log('Supabase not available, skipping cloud pull for', key)
      return { ok: false, reason: 'no-supabase' }
    }
    const sessionResp = await window.supabase.auth.getSession().catch((err) => {
      UserAppSettingsService.log('Failed to get Supabase session', err)
      return null
    })
    const userId = sessionResp?.data?.session?.user?.id
    if (!userId) return { ok: false, reason: 'no-user' }

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
      return { ok: false, reason, error }
    }
    if (!row) {
      UserAppSettingsService.log('No cloud row found for key', key)
      return { ok: false, reason: 'no-cloud' }
    }

    const cloudUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0
    const { value: localValue, meta: localMeta } = await UserAppSettingsService.getSetting(key)
    const localUpdated = localMeta && localMeta.updated_at ? new Date(localMeta.updated_at).getTime() : 0

    if (!localValue && row.data) {
      // no local, cloud present -> write cloud to local
      await setLocalItem(key, JSON.stringify(row.data))
      await setLocalItem(key + META_SUFFIX, JSON.stringify({ updated_at: row.updated_at }))
      UserAppSettingsService.log('Pulled cloud setting to local', key)
      return { ok: true, action: 'cloud-to-local' }
    }

    if (cloudUpdated > localUpdated) {
      // cloud newer -> replace local
      await setLocalItem(key, JSON.stringify(row.data))
      await setLocalItem(key + META_SUFFIX, JSON.stringify({ updated_at: row.updated_at }))
      UserAppSettingsService.log('Cloud setting is newer; updated local value', key)
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
      return { ok: true, action: 'local-to-cloud' }
    }

    UserAppSettingsService.log('No sync action needed; local and cloud timestamps equal', key)
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
