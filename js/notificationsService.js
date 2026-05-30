import { StorageManager } from './storage.js'

const SETTINGS_KEY = 'nexora_notifications_settings_v1'
const HISTORY_KEY = 'nexora_notifications_history_v1'

const defaultSettings = {
  enabled: false,
  permission: 'default',
  remainingExpenseThreshold: 500,
  updated_at: null
}

const readJson = async (key, fallback) => {
  try {
    const raw = await StorageManager.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // Fallback below
  }

  try {
    if (typeof SafeStorage !== 'undefined') {
      const raw = SafeStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    }
  } catch {
    // Fallback below
  }

  return fallback
}

const writeJson = async (key, value) => {
  const serialized = JSON.stringify(value)
  await StorageManager.setItem(key, serialized)
  try {
    if (typeof SafeStorage !== 'undefined') SafeStorage.setItem(key, serialized)
  } catch {
    // Keep StorageManager as source if SafeStorage is unavailable.
  }
}

class NotificationProvider {
  isSupported() {
    return false
  }

  async requestPermission() {
    return 'unsupported'
  }

  async send() {
    return { ok: false, reason: 'provider-not-implemented' }
  }
}

class LocalNotificationProvider extends NotificationProvider {
  isSupported() {
    return typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator
  }

  getPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  }

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported'
    return Notification.requestPermission()
  }

  async send({ title, body, tag }) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return { ok: false, reason: 'permission-denied' }
    }

    const registration = await navigator.serviceWorker.ready.catch(() => null)
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag,
        icon: './icon-192.png',
        badge: './icon-192.png',
        data: { source: 'nexora-local' }
      })
      return { ok: true, provider: 'service-worker' }
    }

    new Notification(title, { body, tag, icon: './icon-192.png' })
    return { ok: true, provider: 'notification-api' }
  }
}

class PushNotificationProvider extends NotificationProvider {
  isSupported() {
    return false
  }

  async requestPermission() {
    return 'unsupported'
  }

  async send() {
    return { ok: false, reason: 'push-provider-not-configured' }
  }
}

const provider = new LocalNotificationProvider()
const pushProvider = new PushNotificationProvider()

const NotificationsService = {
  SETTINGS_KEY,
  HISTORY_KEY,
  notificationProvider: provider,
  NotificationProvider,
  LocalNotificationProvider,
  PushNotificationProvider,

  init: async () => {
    await StorageManager.initIndexedDB()
    const settings = await NotificationsService.getSettings()
    await NotificationsService.saveSettings({
      ...settings,
      permission: provider.getPermission()
    })
  },

  isSupported: () => provider.isSupported(),

  getProviderStatus: () => ({
    local: {
      supported: provider.isSupported(),
      permission: provider.getPermission()
    },
    push: {
      supported: pushProvider.isSupported(),
      configured: false
    }
  }),

  getSettings: async () => {
    const settings = await readJson(SETTINGS_KEY, defaultSettings)
    return { ...defaultSettings, ...(settings || {}), permission: provider.getPermission() }
  },

  saveSettings: async (settings) => {
    const next = {
      ...defaultSettings,
      ...(settings || {}),
      updated_at: new Date().toISOString()
    }
    await writeJson(SETTINGS_KEY, next)
    return next
  },

  enable: async () => {
    if (!provider.isSupported()) {
      return NotificationsService.saveSettings({ enabled: false, permission: 'unsupported' })
    }
    const permission = await provider.requestPermission()
    return NotificationsService.saveSettings({ enabled: permission === 'granted', permission })
  },

  disable: async () => {
    const settings = await NotificationsService.getSettings()
    return NotificationsService.saveSettings({ ...settings, enabled: false, permission: provider.getPermission() })
  },

  test: async () => {
    const settings = await NotificationsService.getSettings()
    if (!settings.enabled) return { ok: false, reason: 'disabled' }
    return provider.send({
      title: 'Nexora',
      body: 'Les notifications Nexora sont correctement configurées.',
      tag: 'nexora-test'
    })
  },

  getHistory: async () => {
    const history = await readJson(HISTORY_KEY, { sent: {} })
    return history && typeof history === 'object' ? { sent: {}, ...history } : { sent: {} }
  },

  markSent: async (signature) => {
    const history = await NotificationsService.getHistory()
    history.sent[signature] = new Date().toISOString()
    await writeJson(HISTORY_KEY, history)
  },

  hasSent: async (signature) => {
    const history = await NotificationsService.getHistory()
    return Boolean(history.sent?.[signature])
  },

  sendOnce: async ({ eventKey, periodKey, title = 'Nexora', body, tag }) => {
    const settings = await NotificationsService.getSettings()
    if (!settings.enabled || settings.permission !== 'granted') {
      return { ok: false, reason: 'disabled-or-denied' }
    }

    const signature = `${periodKey || 'global'}:${eventKey}`
    if (await NotificationsService.hasSent(signature)) {
      return { ok: false, reason: 'already-sent' }
    }

    const result = await provider.send({ title, body, tag: tag || signature })
    if (result.ok) await NotificationsService.markSent(signature)
    return result
  },

  evaluateBusinessNotifications: async ({ monthKey, cycleLabel, metrics = {}, savingsTarget = 0 }) => {
    const settings = await NotificationsService.getSettings()
    if (!settings.enabled || settings.permission !== 'granted') return

    const periodKey = monthKey || 'current'
    await NotificationsService.sendOnce({
      eventKey: 'cycle-start',
      periodKey,
      body: `Nouveau cycle budgétaire : ${cycleLabel || periodKey}.`
    })

    if (Number(metrics.solde || 0) < 0) {
      await NotificationsService.sendOnce({
        eventKey: 'negative-forecast',
        periodKey,
        body: 'Le solde prévisionnel du mois est négatif.'
      })
    }

    if (Number(metrics.totalDepRestant || 0) >= Number(settings.remainingExpenseThreshold || 0)) {
      await NotificationsService.sendOnce({
        eventKey: 'large-remaining-expenses',
        periodKey,
        body: `Il reste encore ${Math.round(metrics.totalDepRestant).toLocaleString('fr-FR')} € de dépenses à payer.`
      })
    }

    if (Number(savingsTarget || 0) > 0 && Number(metrics.solde || 0) < Number(savingsTarget || 0)) {
      await NotificationsService.sendOnce({
        eventKey: 'savings-below-target',
        periodKey,
        body: "L'épargne prévue est inférieure à l'objectif mensuel."
      })
    }

    const goals = await window.GoalsService?.listGoals?.().catch(() => [])
    if (!Array.isArray(goals)) return
    for (const goal of goals) {
      const current = Number(goal.current) || 0
      const target = Number(goal.target) || 0
      if (target <= 0) continue
      const pct = current / target * 100
      if (pct >= 100) {
        await NotificationsService.sendOnce({
          eventKey: `goal-reached-${goal.id}`,
          periodKey,
          body: `Objectif atteint : ${goal.name || 'objectif financier'}.`
        })
      } else if (pct >= 90) {
        await NotificationsService.sendOnce({
          eventKey: `goal-almost-${goal.id}`,
          periodKey,
          body: `Objectif presque atteint : ${goal.name || 'objectif financier'} est à ${Math.round(pct)}%.`
        })
      }
    }
  }
}

export { NotificationsService }
