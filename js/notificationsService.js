import { StorageManager } from './storage.js'
import { STORAGE_KEYS } from '../src/constants/storageKeys.js'
import { getNamespacedStorageKey } from './userStorage.js'

const SETTINGS_KEY = STORAGE_KEYS.notificationsSettings
const HISTORY_KEY = STORAGE_KEYS.notificationsHistory

const defaultSettings = {
  enabled: false,
  permission: 'default',
  lastTestOk: false,
  lastTestAt: null,
  lastTestReason: null,
  remainingExpenseThreshold: 500,
  updated_at: null
}

const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)')?.matches === true
    || window.navigator?.standalone === true
}

const readJson = async (key, fallback) => {
  const namespacedKey = getNamespacedStorageKey(key)
  try {
    const raw = await StorageManager.getItem(namespacedKey)
    if (raw) return JSON.parse(raw)
  } catch {
    // Fallback below
  }

  try {
    if (typeof SafeStorage !== 'undefined') {
      const raw = SafeStorage.getItem(namespacedKey)
      if (raw) return JSON.parse(raw)
    }
  } catch {
    // Fallback below
  }

  return fallback
}

const writeJson = async (key, value) => {
  const namespacedKey = getNamespacedStorageKey(key)
  const serialized = JSON.stringify(value)
  await StorageManager.setItem(namespacedKey, serialized)
  try {
    if (typeof SafeStorage !== 'undefined') SafeStorage.setItem(namespacedKey, serialized)
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
  hasNotificationApi() {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  hasServiceWorker() {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  }

  isSupported() {
    return this.hasNotificationApi() && this.hasServiceWorker()
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

    let serviceWorkerError = null
    try {
      const registration = await navigator.serviceWorker.ready.catch(() => null)
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          tag,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { source: 'nexora-local' }
        })
        return { ok: true, provider: 'service-worker' }
      }
    } catch (err) {
      serviceWorkerError = err
    }

    try {
      new Notification(title, { body, tag, icon: '/icon-192.png' })
      return { ok: true, provider: 'notification-api' }
    } catch (err) {
      return {
        ok: false,
        reason: serviceWorkerError ? 'service-worker-notification-failed' : 'notification-api-failed',
        error: err,
        serviceWorkerError
      }
    }
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

const VALID_NOTIFICATION_TYPES = ['budget', 'objectif', 'facture', 'réussite', 'système']
const VALID_NOTIFICATION_PRIORITIES = ['info', 'warning', 'critical', 'success']

const normalizeNotification = (notification = {}) => {
  const createdAt = notification.createdAt || new Date().toISOString()
  const type = VALID_NOTIFICATION_TYPES.includes(notification.type) ? notification.type : 'système'
  const priority = VALID_NOTIFICATION_PRIORITIES.includes(notification.priority) ? notification.priority : 'info'
  return {
    id: notification.id || `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    priority,
    title: String(notification.title || 'Nexora').trim(),
    message: String(notification.message || '').trim(),
    createdAt,
    readAt: notification.readAt || null,
    archivedAt: notification.archivedAt || null,
    source: notification.source || 'system',
    actionLabel: notification.actionLabel || null,
    actionTarget: notification.actionTarget || null
  }
}

const getNotificationSignature = (notification) => [
  notification.type,
  notification.source,
  notification.title,
  notification.actionTarget || ''
].join('|')

const toNumber = (value) => {
  const parsed = Number.parseFloat(String(value || '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

const getPendingFixedBills = () => {
  if (typeof document === 'undefined') return []
  const fixedBlock = Array.from(document.querySelectorAll('#section-saisie .budget-block'))[1]
  if (!fixedBlock) return []

  return Array.from(fixedBlock.querySelectorAll('.budget-row'))
    .map(row => {
      const amountInput = row.querySelector('input.budget-input[data-key]:not(.paid-input):not(.note-input)')
      const paidInput = row.querySelector('input.paid-input')
      const label = row.querySelector('.budget-row-label')
      const expected = toNumber(amountInput?.value)
      const paid = toNumber(paidInput?.value)
      return {
        name: String(label?.textContent || 'Facture').replace(/[✎×💬✓]/g, '').trim(),
        expected,
        paid,
        remaining: Math.max(0, expected - paid)
      }
    })
    .filter(item => item.expected > 0 && item.remaining > 0.01)
}

const getCycleTiming = (monthKey) => {
  if (typeof window === 'undefined' || typeof window.getBudgetCycleRange !== 'function') return null
  try {
    const range = window.getBudgetCycleRange(monthKey)
    if (!range?.end) return null
    const end = new Date(range.end)
    if (!Number.isFinite(end.getTime())) return null
    const now = new Date()
    const daysToEnd = Math.ceil((end.setHours(23, 59, 59, 999) - now.getTime()) / 86400000)
    return { daysToEnd }
  } catch {
    return null
  }
}

const readHistoricalSavings = (currentMonth) => {
  if (typeof SafeStorage === 'undefined' || typeof window === 'undefined') return []
  const months = Array.from({ length: 12 }, (_, index) => {
    if (typeof window.monthShift !== 'function') return null
    return window.monthShift(currentMonth, -index - 1)
  }).filter(Boolean)

  return months.map(month => {
    try {
      const data = JSON.parse(SafeStorage.getItem(`budget_${month}`) || 'null')
      const values = data?.values || data
      if (!values || typeof values !== 'object') return null
      const read = key => toNumber(values[key])
      const income = ['rev_ali', 'rev_megane', 'rev_excep'].reduce((sum, key) => sum + read(key), 0)
      const expenses = Object.entries(values).reduce((sum, [key, value]) => (
        key.startsWith('rev_') || key.endsWith('_paid') || key.endsWith('_note') ? sum : sum + toNumber(value)
      ), 0)
      return income - expenses
    } catch {
      return null
    }
  }).filter(value => Number.isFinite(value))
}

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
      permission: provider.getPermission(),
      notificationApi: provider.hasNotificationApi(),
      serviceWorker: provider.hasServiceWorker(),
      standalonePwa: isStandalonePwa()
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
    if (!provider.isSupported()) {
      const reason = !provider.hasNotificationApi()
        ? 'notification-api-unsupported'
        : 'service-worker-unsupported'
      await NotificationsService.saveSettings({ enabled: false, permission: provider.getPermission(), lastTestOk: false, lastTestAt: new Date().toISOString(), lastTestReason: reason })
      return { ok: false, reason, status: NotificationsService.getProviderStatus() }
    }

    let permission = provider.getPermission()
    if (permission === 'default') {
      permission = await provider.requestPermission()
    }

    if (permission === 'denied') {
      await NotificationsService.saveSettings({ enabled: false, permission, lastTestOk: false, lastTestAt: new Date().toISOString(), lastTestReason: 'permission-denied' })
      return { ok: false, reason: 'permission-denied', status: NotificationsService.getProviderStatus() }
    }

    if (permission !== 'granted') {
      await NotificationsService.saveSettings({ enabled: false, permission, lastTestOk: false, lastTestAt: new Date().toISOString(), lastTestReason: 'permission-not-granted' })
      return { ok: false, reason: 'permission-not-granted', status: NotificationsService.getProviderStatus() }
    }

    const currentSettings = await NotificationsService.getSettings()
    await NotificationsService.saveSettings({ ...currentSettings, enabled: true, permission })
    const result = await provider.send({
      title: 'Nexora',
      body: 'Les notifications Nexora sont correctement configurées.',
      tag: 'nexora-test'
    })
    await NotificationsService.saveSettings({
      ...currentSettings,
      enabled: result.ok,
      permission,
      lastTestOk: result.ok,
      lastTestAt: new Date().toISOString(),
      lastTestReason: result.ok ? null : result.reason
    })
    return { ...result, status: NotificationsService.getProviderStatus() }
  },

  getHistory: async () => {
    const history = await readJson(HISTORY_KEY, { sent: {}, notifications: [] })
    const normalized = history && typeof history === 'object' ? { sent: {}, notifications: [], ...history } : { sent: {}, notifications: [] }
    normalized.notifications = Array.isArray(normalized.notifications)
      ? normalized.notifications.map(normalizeNotification)
      : []
    return normalized
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

  listNotifications: async ({ includeArchived = false } = {}) => {
    const history = await NotificationsService.getHistory()
    return history.notifications
      .filter(notification => includeArchived || !notification.archivedAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  },

  getCounts: async () => {
    const notifications = await NotificationsService.listNotifications({ includeArchived: true })
    return {
      total: notifications.filter(notification => !notification.archivedAt).length,
      unread: notifications.filter(notification => !notification.readAt && !notification.archivedAt).length,
      read: notifications.filter(notification => notification.readAt && !notification.archivedAt).length,
      archived: notifications.filter(notification => notification.archivedAt).length
    }
  },

  dedupeNotification: async (notification) => {
    const history = await NotificationsService.getHistory()
    const next = normalizeNotification(notification)
    const signature = getNotificationSignature(next)
    const lastSame = history.notifications.find(item => getNotificationSignature(item) === signature && !item.archivedAt)
    if (lastSame) return { duplicate: true, notification: lastSame }
    return { duplicate: false, notification: next }
  },

  createNotification: async (notification) => {
    const history = await NotificationsService.getHistory()
    const { duplicate, notification: next } = await NotificationsService.dedupeNotification(notification)
    if (duplicate) return next
    history.notifications.unshift(next)
    history.notifications = history.notifications.slice(0, 80)
    await writeJson(HISTORY_KEY, history)
    if (typeof window !== 'undefined') window.dispatchEvent?.(new CustomEvent('nexora:notifications-updated'))
    return next
  },

  markNotificationRead: async (id) => {
    const history = await NotificationsService.getHistory()
    const now = new Date().toISOString()
    history.notifications = history.notifications.map(notification => (
      notification.id === id ? { ...notification, readAt: notification.readAt || now } : notification
    ))
    await writeJson(HISTORY_KEY, history)
    if (typeof window !== 'undefined') window.dispatchEvent?.(new CustomEvent('nexora:notifications-updated'))
  },

  markAllNotificationsRead: async () => {
    const history = await NotificationsService.getHistory()
    const now = new Date().toISOString()
    history.notifications = history.notifications.map(notification => (
      notification.archivedAt ? notification : { ...notification, readAt: notification.readAt || now }
    ))
    await writeJson(HISTORY_KEY, history)
    if (typeof window !== 'undefined') window.dispatchEvent?.(new CustomEvent('nexora:notifications-updated'))
  },

  archiveNotification: async (id) => {
    const history = await NotificationsService.getHistory()
    const now = new Date().toISOString()
    history.notifications = history.notifications.map(notification => (
      notification.id === id ? { ...notification, readAt: notification.readAt || now, archivedAt: notification.archivedAt || now } : notification
    ))
    await writeJson(HISTORY_KEY, history)
    if (typeof window !== 'undefined') window.dispatchEvent?.(new CustomEvent('nexora:notifications-updated'))
  },

  archiveAllNotifications: async () => {
    const history = await NotificationsService.getHistory()
    const now = new Date().toISOString()
    history.notifications = history.notifications.map(notification => (
      notification.archivedAt ? notification : { ...notification, readAt: notification.readAt || now, archivedAt: now }
    ))
    await writeJson(HISTORY_KEY, history)
    if (typeof window !== 'undefined') window.dispatchEvent?.(new CustomEvent('nexora:notifications-updated'))
  },

  restoreNotification: async (id) => {
    const history = await NotificationsService.getHistory()
    history.notifications = history.notifications.map(notification => (
      notification.id === id ? { ...notification, archivedAt: null } : notification
    ))
    await writeJson(HISTORY_KEY, history)
    if (typeof window !== 'undefined') window.dispatchEvent?.(new CustomEvent('nexora:notifications-updated'))
  },

  getUnreadCount: async () => {
    const notifications = await NotificationsService.listNotifications()
    return notifications.filter(notification => !notification.readAt && !notification.archivedAt).length
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
    const periodKey = monthKey || 'current'
    const revenue = Number(metrics.revReel || metrics.income || 0)
    const solde = Number(metrics.solde || 0)
    const tauxEp = Number(metrics.tauxEp || 0)
    const totalDepRestant = Number(metrics.totalDepRestant || 0)

    if (revenue <= 0) {
      await NotificationsService.createNotification({
        type: 'budget',
        priority: 'info',
        title: 'Budget à compléter',
        message: 'Ajoutez vos revenus pour calculer votre situation.',
        source: `budget:${periodKey}`,
        actionLabel: 'Ouvrir le budget',
        actionTarget: 'saisie'
      })
      return
    }

    if (settings.enabled && settings.permission === 'granted') {
      await NotificationsService.sendOnce({
        eventKey: 'cycle-start',
        periodKey,
        body: `Nouveau cycle budgétaire : ${cycleLabel || periodKey}.`
      })
    }

    if (solde < 0) {
      await NotificationsService.createNotification({
        type: 'budget',
        priority: 'critical',
        title: 'Solde prévisionnel négatif',
        message: 'Le solde prévisionnel du mois est négatif.',
        source: `budget:${periodKey}:negative`,
        actionLabel: 'Voir budget',
        actionTarget: 'saisie'
      })
      if (settings.enabled && settings.permission === 'granted') {
        await NotificationsService.sendOnce({
          eventKey: 'negative-forecast',
          periodKey,
          body: 'Le solde prévisionnel du mois est négatif.'
        })
      }
    } else {
      await NotificationsService.createNotification({
        type: 'réussite',
        priority: 'success',
        title: 'Budget positif',
        message: 'Bravo, votre budget reste positif.',
        source: `budget:${periodKey}:positive`,
        actionLabel: 'Voir tableau de bord',
        actionTarget: 'dashboard'
      })
    }

    if (totalDepRestant >= Number(settings.remainingExpenseThreshold || 0)) {
      await NotificationsService.createNotification({
        type: 'facture',
        priority: 'warning',
        title: 'Charges à payer',
        message: `Il reste encore ${Math.round(totalDepRestant).toLocaleString('fr-FR')} € de dépenses à payer.`,
        source: `budget:${periodKey}:remaining`,
        actionLabel: 'Voir budget',
        actionTarget: 'saisie'
      })
      await NotificationsService.sendOnce({
        eventKey: 'large-remaining-expenses',
        periodKey,
        body: `Il reste encore ${Math.round(metrics.totalDepRestant).toLocaleString('fr-FR')} € de dépenses à payer.`
      })
    }

    const pendingBills = getPendingFixedBills()
    const cycleTiming = getCycleTiming(periodKey)
    if (pendingBills.length > 0 && cycleTiming) {
      const pendingTotal = pendingBills.reduce((sum, item) => sum + item.remaining, 0)
      const firstNames = pendingBills.slice(0, 3).map(item => item.name).join(', ')
      const moreLabel = pendingBills.length > 3 ? ` et ${pendingBills.length - 3} autre(s)` : ''
      if (cycleTiming.daysToEnd < 0) {
        await NotificationsService.createNotification({
          type: 'facture',
          priority: 'critical',
          title: 'Factures en retard',
          message: `${pendingBills.length} facture(s) restent à régler (${Math.round(pendingTotal).toLocaleString('fr-FR')} €) : ${firstNames}${moreLabel}.`,
          source: `bills:${periodKey}:late`,
          actionLabel: 'Voir budget',
          actionTarget: 'saisie'
        })
      } else if (cycleTiming.daysToEnd <= 5) {
        await NotificationsService.createNotification({
          type: 'facture',
          priority: 'warning',
          title: 'Factures bientôt dues',
          message: `${pendingBills.length} facture(s) à finaliser avant la fin du cycle (${Math.round(pendingTotal).toLocaleString('fr-FR')} €).`,
          source: `bills:${periodKey}:soon`,
          actionLabel: 'Voir budget',
          actionTarget: 'saisie'
        })
      }
    }

    if (revenue > 0 && solde > 0 && tauxEp >= 20) {
      await NotificationsService.createNotification({
        type: 'réussite',
        priority: 'success',
        title: 'Épargne réalisée',
        message: `Votre taux d’épargne atteint ${Math.round(tauxEp)}% ce mois-ci.`,
        source: `success:${periodKey}:savings`,
        actionLabel: 'Voir tableau de bord',
        actionTarget: 'dashboard'
      })
    }

    const previousSavings = readHistoricalSavings(periodKey)
    if (solde > 0 && previousSavings.length >= 2 && solde > Math.max(...previousSavings)) {
      await NotificationsService.createNotification({
        type: 'réussite',
        priority: 'success',
        title: 'Record d’épargne',
        message: `C’est votre meilleur solde prévisionnel sur les derniers mois : ${Math.round(solde).toLocaleString('fr-FR')} €.`,
        source: `success:${periodKey}:record-savings`,
        actionLabel: 'Voir historique',
        actionTarget: 'historique'
      })
    }

    const goals = await window.GoalsService?.listGoals?.().catch(() => [])
    if (!Array.isArray(goals)) return
    const emptyGoals = goals.filter(goal => {
      const current = Number(goal.current) || 0
      const target = Number(goal.target) || 0
      return target > 0 && current <= 0
    })
    if (emptyGoals.length > 0) {
      await NotificationsService.createNotification({
        type: 'objectif',
        priority: 'info',
        title: emptyGoals.length === 1 ? 'Objectif non alimenté' : `${emptyGoals.length} objectifs non alimentés`,
        message: emptyGoals.length === 1
          ? `L’objectif ${emptyGoals[0].name || 'objectif financier'} n’a pas encore de contribution.`
          : `Plusieurs objectifs attendent une première contribution : ${emptyGoals.slice(0, 3).map(goal => goal.name || 'objectif').join(', ')}.`,
        source: `goals:${periodKey}:empty-group`,
        actionLabel: 'Voir objectifs',
        actionTarget: 'objectifs'
      })
    }
    for (const goal of goals) {
      const current = Number(goal.current) || 0
      const target = Number(goal.target) || 0
      if (target <= 0) continue
      const pct = current / target * 100
      const targetDate = goal.targetDate ? new Date(goal.targetDate) : null
      const daysRemaining = targetDate && Number.isFinite(targetDate.getTime())
        ? Math.ceil((targetDate - new Date()) / 86400000)
        : null
      const remaining = Math.max(0, target - current)
      const monthlyReference = Number(
        savingsTarget ||
        (typeof document !== 'undefined' ? document.getElementById('goal-monthly-contrib')?.value : 0) ||
        0
      )
      const monthsRemaining = daysRemaining !== null ? Math.max(0, daysRemaining / 30.4) : null
      const requiredMonthly = monthsRemaining && monthsRemaining > 0 ? remaining / monthsRemaining : null
      if (current <= 0) {
        continue
      } else if (pct >= 100) {
        await NotificationsService.createNotification({
          type: 'réussite',
          priority: 'success',
          title: 'Objectif atteint',
          message: `Objectif atteint : ${goal.name || 'objectif financier'}.`,
          source: `goal:${goal.id}:reached`,
          actionLabel: 'Voir objectifs',
          actionTarget: 'objectifs'
        })
      } else if (daysRemaining !== null && daysRemaining < 0) {
        await NotificationsService.createNotification({
          type: 'objectif',
          priority: 'warning',
          title: 'Objectif en retard',
          message: `${goal.name || 'Objectif financier'} a dépassé son échéance avec ${Math.round(pct)}% atteint.`,
          source: `goal:${goal.id}:late`,
          actionLabel: 'Voir objectifs',
          actionTarget: 'objectifs'
        })
      } else if (requiredMonthly && monthlyReference > 0 && requiredMonthly > monthlyReference * 1.25) {
        await NotificationsService.createNotification({
          type: 'objectif',
          priority: 'warning',
          title: 'Rythme à ajuster',
          message: `${goal.name || 'Objectif financier'} demande environ ${Math.ceil(requiredMonthly).toLocaleString('fr-FR')} €/mois pour rester dans les temps.`,
          source: `goal:${goal.id}:behind-pace`,
          actionLabel: 'Voir objectifs',
          actionTarget: 'objectifs'
        })
      } else if (pct >= 90) {
        await NotificationsService.createNotification({
          type: 'objectif',
          priority: 'success',
          title: 'Objectif bientôt atteint',
          message: `${goal.name || 'Objectif financier'} est à ${Math.round(pct)}%.`,
          source: `goal:${goal.id}:almost`,
          actionLabel: 'Voir objectifs',
          actionTarget: 'objectifs'
        })
      }
    }
  }
}

export { NotificationsService }
