import assert from 'node:assert/strict'

const storageValues = new Map()
globalThis.localStorage = {
  getItem: key => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: key => storageValues.delete(key)
}

class MockNotification {
  static permission = 'granted'
}

globalThis.Notification = MockNotification
globalThis.window = {
  Notification: MockNotification,
  dispatchEvent: () => true
}
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { serviceWorker: { ready: Promise.resolve({ showNotification: async () => true }) } }
})

const { NotificationsService } = await import('./notificationsService.js')
const { AuthContext } = await import('../src/auth/authContext.js')

const setUser = userId => {
  AuthContext._state.user = userId ? { id: userId } : null
  AuthContext._state.session = userId ? { user: { id: userId } } : null
}

await NotificationsService.saveSettings({ enabled: false, permission: 'granted' })
const disabledResult = await NotificationsService.sendOnce({
  eventKey: 'disabled',
  periodKey: '2026-09',
  body: 'ne doit pas partir'
})
assert.equal(disabledResult.reason, 'disabled-or-denied')

MockNotification.permission = 'denied'
const deniedResult = await NotificationsService.sendOnce({
  eventKey: 'denied',
  periodKey: '2026-09',
  body: 'ne doit pas partir'
})
assert.equal(deniedResult.reason, 'disabled-or-denied')
MockNotification.permission = 'granted'

const originalNotification = globalThis.Notification
const originalWindowNotification = globalThis.window.Notification
delete globalThis.Notification
delete globalThis.window.Notification
assert.equal(NotificationsService.getProviderStatus().local.permission, 'unsupported')
const unsupportedResult = await NotificationsService.sendOnce({
  eventKey: 'unsupported',
  periodKey: '2026-09',
  body: 'ne doit pas partir'
})
assert.equal(unsupportedResult.reason, 'disabled-or-denied')
globalThis.Notification = originalNotification
globalThis.window.Notification = originalWindowNotification

await NotificationsService.createNotification({
  type: 'budget',
  priority: 'warning',
  title: 'Seuil atteint',
  message: 'Budget proche de la limite',
  source: 'test:threshold',
  actionTarget: 'saisie'
})
const duplicateResults = await Promise.all([
  NotificationsService.createNotification({
    type: 'budget',
    priority: 'warning',
    title: 'Seuil atteint',
    message: 'Budget proche de la limite',
    source: 'test:threshold',
    actionTarget: 'saisie'
  }),
  NotificationsService.createNotification({
    type: 'budget',
    priority: 'warning',
    title: 'Seuil atteint',
    message: 'Budget proche de la limite',
    source: 'test:threshold',
    actionTarget: 'saisie'
  })
])
assert.equal(duplicateResults.length, 2)
const thresholdMatches = (await NotificationsService.listNotifications())
  .filter(notification => notification.source === 'test:threshold')
assert.equal(thresholdMatches.length, 1)

await NotificationsService.createNotification({
  type: 'budget',
  title: 'Événement A',
  source: 'test:different-a',
  actionTarget: 'saisie'
})
await NotificationsService.createNotification({
  type: 'budget',
  title: 'Événement B',
  source: 'test:different-b',
  actionTarget: 'saisie'
})
const differentEvents = (await NotificationsService.listNotifications())
  .filter(notification => notification.source.startsWith('test:different-'))
assert.equal(differentEvents.length, 2)

await NotificationsService.saveSettings({ enabled: true, permission: 'granted' })
const sendResults = await Promise.all([
  NotificationsService.sendOnce({ eventKey: 'threshold', periodKey: '2026-09', body: 'Alerte' }),
  NotificationsService.sendOnce({ eventKey: 'threshold', periodKey: '2026-09', body: 'Alerte' })
])
assert.equal(sendResults.filter(result => result.ok).length, 1)
assert.equal(sendResults.filter(result => result.reason === 'already-sent').length, 1)

const sentHistory = await NotificationsService.getHistory()
assert.ok(sentHistory.sent['2026-09:threshold'])

for (const corruptedValue of [null, 'invalid', [], { sent: null, notifications: 'invalid' }]) {
  storageValues.set('nexora_notifications_history_v1', JSON.stringify(corruptedValue))
  const recovered = await NotificationsService.getHistory()
  assert.deepEqual(recovered.sent, {})
  assert.deepEqual(recovered.notifications, [])
}

storageValues.clear()
setUser('user-a')
await NotificationsService.createNotification({
  type: 'budget',
  title: 'A privé',
  source: 'test:isolation',
  actionTarget: 'saisie'
})
setUser('user-b')
assert.equal((await NotificationsService.listNotifications()).length, 0)
await NotificationsService.createNotification({
  type: 'budget',
  title: 'B privé',
  source: 'test:isolation',
  actionTarget: 'saisie'
})
setUser('user-a')
assert.equal((await NotificationsService.listNotifications()).length, 1)
setUser(null)

console.info('notificationsService-tests: permissions and concurrent deduplication - OK')