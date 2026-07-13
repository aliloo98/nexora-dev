/**
 * Accès unifié aux réglages synchronisés (UserAppSettingsService + fallback SafeStorage).
 */
import { UserAppSettingsService } from './userAppSettingsService.js'
import { getNamespacedStorageKey } from './userStorage.js'

const readSafeStorageJson = (key, fallback) => {
  try {
    const namespaced = getNamespacedStorageKey(key)
    const storageKey = namespaced === key ? key : namespaced
    const raw = (typeof SafeStorage !== 'undefined' ? SafeStorage.getItem(storageKey) : null)
      || (typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const writeSafeStorageJson = (key, value) => {
  const serialized = JSON.stringify(value)
  const namespaced = getNamespacedStorageKey(key)
  try {
    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setItem(namespaced, serialized)
    }
  } catch {
    // continue
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(namespaced, serialized)
    }
  } catch {
    // continue
  }
}

export async function readSyncedArray(key, fallback = []) {
  try {
    if (UserAppSettingsService?.getSetting) {
      const { value } = await UserAppSettingsService.getSetting(key)
      if (Array.isArray(value)) return value
    }
  } catch (err) {
    console.warn('[syncedSettingAccess] read failed', key, err)
  }
  const local = readSafeStorageJson(key, fallback)
  return Array.isArray(local) ? local : fallback
}

export async function writeSyncedArray(key, value) {
  const normalized = Array.isArray(value) ? value : []
  const now = new Date().toISOString()
  const payload = normalized.map((item) => (
    item && typeof item === 'object' ? { ...item, updated_at: item.updated_at || now } : item
  ))

  writeSafeStorageJson(key, payload)

  if (UserAppSettingsService?.saveSetting) {
    await UserAppSettingsService.saveSetting(key, payload)
    if (UserAppSettingsService.syncLocalSettingToCloud) {
      await UserAppSettingsService.syncLocalSettingToCloud(key).catch((err) => {
        console.warn('[syncedSettingAccess] cloud push failed', key, err)
      })
    }
  }
  return payload
}

export async function hydrateSyncedSettingFromCloud(key) {
  if (!UserAppSettingsService?.syncCloudSettingToLocal) {
    return { ok: false, reason: 'no-service' }
  }
  return UserAppSettingsService.syncCloudSettingToLocal(key)
}

export default { readSyncedArray, writeSyncedArray, hydrateSyncedSettingFromCloud }
