/**
 * User Data Bootstrap
 *
 * Handles synchronization of user-specific data:
 * - Goals cloud synchronization
 * - User settings synchronization
 * - Sync diagnostics and logging
 *
 * Note: These operations are not adjacent in the initialization sequence.
 * They are called at different times to preserve the exact order.
 *
 * @param {Object} dependencies
 * @param {Object} dependencies.UserAppSettingsService - User app settings service
 * @param {Object} dependencies.STORAGE_KEYS - Storage keys constants
 * @param {Function} dependencies.recordLastSync - Function to record last sync
 * @param {Object} dependencies.SyncDiagnostics - Sync diagnostics module
 * @param {Function} dependencies.refreshAboutPanel - Function to refresh about panel
 * @param {Function} dependencies.refreshNexoraStatusBar - Function to refresh status bar
 */

/**
 * Step 14: Synchronize goals from cloud to local
 * Called before UI rendering to ensure cloud-only goals appear on fresh devices
 */
export async function syncInitialGoals({
  UserAppSettingsService,
  STORAGE_KEYS
}) {
  if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService?.syncCloudSettingToLocal) {
    try {
      await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.goals)
    } catch (e) {
      console.warn('⚠️ Goals cloud hydration failed', e)
    }
  }
}

/**
 * Steps 22-23: Synchronize all user application settings
 * Called after UI rendering to sync cloud/local settings and update diagnostics
 */
export async function syncUserApplicationSettings({
  UserAppSettingsService,
  recordLastSync,
  SyncDiagnostics,
  refreshAboutPanel,
  refreshNexoraStatusBar
}) {
  if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService && typeof UserAppSettingsService.syncAllAppSettings === 'function') {
    try {
      const syncResults = await UserAppSettingsService.syncAllAppSettings()
      recordLastSync({ action: 'bootstrap', keys: Object.keys(syncResults || {}) })
      SyncDiagnostics.logSyncEvent('bootstrap', 'syncAllAppSettings', { ok: true, keys: Object.keys(syncResults || {}) })
      refreshAboutPanel()
      refreshNexoraStatusBar()
    } catch (e) {
      console.warn('⚠️ User app settings sync failed', e)
      SyncDiagnostics.logSyncEvent('bootstrap', 'syncAllAppSettings', { ok: false, error: e?.message })
    }
  }
}
