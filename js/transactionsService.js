/**
 * Nexora - TransactionsService
 * Pont transactionnel historique avec fallback localStorage.
 *
 * La synchronisation cloud legacy reste desactivee par defaut tant que ses
 * tables et son contrat de donnees ne sont pas alignes avec le backend actuel.
 * Le budget mensuel canonique est gere par MonthlyBudgetStateService.
 *
 * IMPORTANT: Ne modifie AUCUNE logique metier.
 * Les calculs (updateAll, buildHistory) restent inchanges.
 * Ce service est un PONT entre l'UI et la source de donnees.
 */

import { supabase } from '../src/supabase.js'
import AuthContext from '../src/auth/authContext.js'
import { getCurrentUserId } from './userStorage.js'

const log = () => {}
const env = typeof import.meta !== 'undefined' ? import.meta.env || {} : {}

export const shouldEnableLegacyTransactionCloudSync = (value = env.VITE_ENABLE_LEGACY_TRANSACTION_SYNC) => (
  value === 'true'
)

const isLegacyCloudSyncEnabled = () => shouldEnableLegacyTransactionCloudSync()

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const isOnline = () => navigator.onLine

const getCurrentUser = () => {
  try {
    const state = AuthContext.getState()
    return state?.isAuthenticated ? state.user : null
  } catch {
    return null
  }
}

const storageKey = (month, userId) => {
  const ownerId = userId || getCurrentUserId()
  return ownerId ? `budget_${ownerId}_${month}` : `budget_${month}`
}
const transactionFallbackKey = (userId) => {
  const ownerId = userId || getCurrentUserId()
  return ownerId ? `nexora_transactions_fallback_v2::user:${ownerId}` : 'nexora_transactions_fallback_v2'
}
const supabaseToLocalMetaKey = (userId) => {
  const ownerId = userId || getCurrentUserId()
  return ownerId ? `nexora_supabase_to_local_meta_v1::user:${ownerId}` : 'nexora_supabase_to_local_meta_v1'
}

// ─────────────────────────────────────────────
// LECTURE DEPUIS LOCALSTORAGE (SafeStorage)
// Fallback garanti - aucune modification
// ─────────────────────────────────────────────
const readFromLocal = (month) => {
  try {
    // Utilise SafeStorage si disponible (compatibilite avec l'app existante)
    const storage = (typeof SafeStorage !== 'undefined') ? SafeStorage : localStorage
    const raw = storage.getItem(storageKey(month))
    const data = raw ? JSON.parse(raw) : {}
    log('local', `Fallback localStorage actif pour ${month}`, { keys: Object.keys(data).length })
    return data
  } catch (err) {
    log('error', 'Erreur lecture localStorage', err.message)
    return {}
  }
}

// Lire toutes les cles budget_* disponibles localement
const readAllMonthsFromLocal = () => {
  try {
    const storage = (typeof SafeStorage !== 'undefined') ? SafeStorage : localStorage
    const ownerId = getCurrentUserId()
    const prefix = ownerId ? `budget_${ownerId}_` : 'budget_'
    const months = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && k.startsWith(prefix)) {
        months.push(k.replace(prefix, ''))
      }
    }
    log('local', `Mois disponibles en local: ${months.length}`, months)
    return months
  } catch (err) {
    log('error', 'Erreur lecture mois locaux', err.message)
    return []
  }
}

const getStorageClient = () => {
  if (typeof SafeStorage !== 'undefined') return SafeStorage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

const readTransactionFallback = () => {
  try {
    const storage = getStorageClient()
    if (!storage) return []
    const raw = storage.getItem(transactionFallbackKey())
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed?.transactions) ? parsed.transactions : []
  } catch (err) {
    log('error', 'Erreur lecture fallback transactions', err.message)
    return []
  }
}

const writeTransactionFallback = (transactions) => {
  try {
    const storage = getStorageClient()
    if (!storage) return false
    storage.setItem(transactionFallbackKey(), JSON.stringify({
      version: 2,
      updated_at: new Date().toISOString(),
      transactions
    }))
    return true
  } catch (err) {
    log('error', 'Erreur ecriture fallback transactions', err.message)
    return false
  }
}

const readSupabaseToLocalMeta = () => {
  try {
    const storage = getStorageClient()
    if (!storage) return {}
    const raw = storage.getItem(supabaseToLocalMetaKey())
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    log('error', 'Erreur lecture meta sync Supabase vers local', err.message)
    return {}
  }
}

const writeSupabaseToLocalMeta = (meta) => {
  try {
    const storage = getStorageClient()
    if (!storage) return false
    storage.setItem(supabaseToLocalMetaKey(), JSON.stringify(meta))
    return true
  } catch (err) {
    log('error', 'Erreur ecriture meta sync Supabase vers local', err.message)
    return false
  }
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const normalizeTransaction = (transaction = {}) => {
  const now = new Date().toISOString()
  const metadata = { ...(transaction.metadata || {}) }
  if (transaction.local_id) metadata.local_id = transaction.local_id

  return {
    id: transaction.id || generateId(),
    user_id: transaction.user_id || null,
    account_id: transaction.account_id || null,
    counterparty_account_id: transaction.counterparty_account_id || null,
    category_id: transaction.category_id || null,
    amount: transaction.amount != null ? Number(transaction.amount) : 0,
    currency: transaction.currency || 'EUR',
    transaction_type: transaction.transaction_type || 'expense',
    label: transaction.label || 'Transaction',
    note: transaction.note || null,
    transaction_date: transaction.transaction_date || now.split('T')[0],
    internal_transfer: Boolean(transaction.internal_transfer),
    linked_transaction_id: transaction.linked_transaction_id || null,
    analytics_ignore: Boolean(transaction.analytics_ignore),
    metadata,
    source: transaction.source || 'local',
    source_origin: transaction.source_origin || 'local',
    sync_status: transaction.sync_status || 'pending',
    synced_at: transaction.synced_at || null,
    created_at: transaction.created_at || now,
    updated_at: transaction.updated_at || now
  }
}

const findSupabaseTransactionByLocalId = async (userId, localId) => {
  if (!userId || !localId) return null

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('local_id', localId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

const toSupabaseTransactionPayload = (transaction) => ({
  id: transaction.id,
  user_id: transaction.user_id,
  label: transaction.label,
  amount: transaction.amount,
  type: transaction.transaction_type,
  category: transaction.metadata?.category || null,
  month: transaction.metadata?.month || null,
  paid: false,
  source_origin: transaction.source_origin || 'manual',
  sync_status: transaction.sync_status || 'pending',
  synced_at: new Date().toISOString(),
  is_internal_transfer: Boolean(transaction.internal_transfer),
  linked_transaction_id: transaction.linked_transaction_id,
  exclude_from_analytics: Boolean(transaction.analytics_ignore),
  local_id: transaction.metadata?.local_id || null,
  created_at: transaction.created_at,
  updated_at: transaction.updated_at
})

const getSupabaseSession = async () => {
  const authResponse = await supabase.auth.getSession()
  return {
    session: authResponse.data?.session || null,
    error: authResponse.error || null
  }
}

const getFallbackOwner = (transaction) => transaction.user_id || getCurrentUser()?.id || null

const parseTransactionLocalId = (localId = '') => {
  const match = String(localId).match(/^(\d{4}-\d{2})_(.+)$/)
  if (!match) return { month: null, category: null }
  return { month: match[1], category: match[2] }
}

const getTransactionMonthAndCategory = (transaction) => {
  const parsed = parseTransactionLocalId(transaction.local_id)
  return {
    month: transaction.month || parsed.month,
    category: transaction.category || parsed.category
  }
}

const normalizeLocalAmount = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

const readBudgetMonthObject = (storage, month) => {
  try {
    const raw = storage.getItem(storageKey(month))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    log('error', `Erreur lecture budget local ${month}`, err.message)
    return {}
  }
}

// ─────────────────────────────────────────────
// LECTURE DEPUIS SUPABASE
// ─────────────────────────────────────────────
const readFromSupabase = async (month, userId) => {
  if (!isLegacyCloudSyncEnabled()) return null

  try {
    log('supa', `Lecture Supabase pour ${month} (user: ${userId?.slice(0,8)}...)`)

    const { data, error } = await supabase
      .from('budget_entries')
      .select('entry_key, amount, paid, label')
      .eq('user_id', userId)
      .eq('month', month)

    if (error) throw error

    if (!data || data.length === 0) {
      log('info', `Aucune donnee Supabase pour ${month}, fallback local`)
      return null // Signale: fallback vers local
    }

    // Convertir format Supabase -> format budget {rev_ali: 2000, loyer: 800...}
    const budgetData = {}
    data.forEach(entry => {
      budgetData[entry.entry_key] = entry.amount
      // Conserver 'paid' si present (cases a cocher)
      if (entry.paid !== null && entry.paid !== undefined) {
        budgetData[`${entry.entry_key}_paid`] = entry.paid
      }
    })

    log('success', `Supabase: ${data.length} entrees chargees pour ${month}`, budgetData)
    return budgetData

  } catch (err) {
    log('error', `Supabase indisponible pour ${month}, activation fallback`, err.message)
    return null // Signale: fallback vers local
  }
}

// Lire tous les mois disponibles depuis Supabase
const readAllMonthsFromSupabase = async (userId) => {
  if (!isLegacyCloudSyncEnabled()) return null

  try {
    log('supa', `Lecture historique Supabase (user: ${userId?.slice(0,8)}...)`)

    const { data, error } = await supabase
      .from('budget_entries')
      .select('month')
      .eq('user_id', userId)
      .order('month', { ascending: false })

    if (error) throw error

    // Deduplicate months
    const months = [...new Set(data.map(d => d.month))]
    log('success', `Supabase: ${months.length} mois disponibles`, months)
    return months

  } catch (err) {
    log('error', 'Erreur lecture mois Supabase', err.message)
    return null
  }
}

// ─────────────────────────────────────────────
// API PUBLIQUE - LECTURE INTELLIGENTE
// ─────────────────────────────────────────────

/**
 * Lire les donnees d'un mois specifique
 * Supabase prioritaire, fallback localStorage automatique
 * @param {string} month - Format 'YYYY-MM'
 * @returns {Promise<Object>} - Donnees budget du mois
 */
const getBudgetMonth = async (month) => {
  const user = getCurrentUser()

  // CAS 1: Non authentifie ou offline -> localStorage direct
  if (!user || !isOnline()) {
    const reason = !user ? 'non-authentifie' : 'mode-offline'
    log('offline', `${reason} - lecture locale pour ${month}`)
    return readFromLocal(month)
  }

  // CAS 2: Authentifie + online -> Supabase d'abord
  const supabaseData = await readFromSupabase(month, user.id)

  if (supabaseData !== null) {
    // Supabase a repondu avec des donnees -> mettre a jour localStorage en silence
    try {
      const storage = (typeof SafeStorage !== 'undefined') ? SafeStorage : localStorage
      storage.setItem(storageKey(month), JSON.stringify(supabaseData))
      log('sync', `Cache local mis a jour pour ${month}`)
    } catch {}
    return supabaseData
  }

  // CAS 3: Supabase n'a pas de donnees pour ce mois -> localStorage
  log('local', `Fallback local active pour ${month} (Supabase vide ou erreur)`)
  return readFromLocal(month)
}

/**
 * Lire tous les mois disponibles (pour buildHistory)
 * Fusionne Supabase + localStorage
 * @returns {Promise<string[]>} - Array de mois 'YYYY-MM'
 */
const getAvailableMonths = async () => {
  const user = getCurrentUser()
  const localMonths = readAllMonthsFromLocal()

  if (!user || !isOnline()) {
    log('offline', 'Mois disponibles depuis localStorage uniquement')
    return localMonths
  }

  const supabaseMonths = await readAllMonthsFromSupabase(user.id)

  if (!supabaseMonths) {
    log('local', 'Fallback: mois depuis localStorage')
    return localMonths
  }

  // Fusionner Supabase + local (sans doublons)
  const merged = [...new Set([...supabaseMonths, ...localMonths])]
    .sort((a, b) => b.localeCompare(a)) // Du plus recent au plus ancien

  log('success', `Mois fusionnes: ${merged.length} (${supabaseMonths.length} Supabase + ${localMonths.length} local)`, merged)
  return merged
}

/**
 * Lire les donnees d'un mois de facon synchrone (pour compatibilite)
 * Retourne localStorage immediatement (non-bloquant)
 * La version async enrichira en arriere-plan
 * @param {string} month
 * @returns {Object}
 */
const getBudgetMonthSync = (month) => {
  return readFromLocal(month)
}

/**
 * Etat de connexion et sync
 */
const getSyncState = () => ({
  isOnline: isOnline(),
  isAuthenticated: getCurrentUser() !== null,
  userId: getCurrentUser()?.id || null,
  legacyCloudSyncEnabled: isLegacyCloudSyncEnabled()
})

const persistTransactionFallback = (normalized) => {
  const localId = normalized.metadata?.local_id
  const ownerId = getFallbackOwner(normalized)
  const fallback = readTransactionFallback()
  const existingIndex = localId
    ? fallback.findIndex(item => item.metadata?.local_id === localId && item.user_id === ownerId)
    : -1

  normalized.user_id = ownerId
  if (existingIndex !== -1) {
    fallback[existingIndex] = normalized
  } else {
    fallback.push(normalized)
  }

  writeTransactionFallback(fallback)
  return normalized
}

const removeTransactionFallback = ({ userId, localId, month, category }) => {
  const fallback = readTransactionFallback()
  const updated = fallback.filter((item) => {
    if (userId && item.user_id && item.user_id !== userId) return true
    if (localId) return item.metadata?.local_id !== localId
    if (month && item.metadata?.month !== month) return true
    if (category && item.metadata?.category !== category) return true
    return false
  })

  writeTransactionFallback(updated)
  return true
}

const create = async (transaction) => {
  const normalized = normalizeTransaction(transaction)
  const localId = normalized.metadata?.local_id

  if (!isLegacyCloudSyncEnabled()) {
    return persistTransactionFallback(normalized)
  }

  let session = null
  let sessionError = null
  try {
    const authState = await getSupabaseSession()
    session = authState.session
    sessionError = authState.error
  } catch (err) {
    sessionError = err
    console.warn('[Phase2B][TransactionsService] Supabase getSession threw:', err)
  }

  if (session?.user?.id) {
    normalized.user_id = session.user.id
  }

  if (normalized.user_id && session?.user?.id && isOnline()) {
    try {
      const supabasePayload = toSupabaseTransactionPayload(normalized)
      const existing = await findSupabaseTransactionByLocalId(normalized.user_id, localId)
      if (existing) {
        const { id, created_at, ...updatePayload } = supabasePayload
        const { data, error } = await supabase
          .from('transactions')
          .update(updatePayload)
          .eq('id', existing.id)
          .eq('user_id', normalized.user_id)
          .select()
          .single()

        if (error) throw error
        return data
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(supabasePayload)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('[Phase2B][TransactionsService] Supabase create full error:', err)
      log('warn', `Create Supabase indisponible, fallback local: ${localId}`, err.message)
    }
  } else {
    console.warn('[Phase2B][TransactionsService] Supabase insert skipped:', {
      reason: !isOnline()
        ? 'offline'
        : !session?.user?.id
          ? 'missing-real-supabase-session'
          : 'missing-user-id',
      normalizedUserId: normalized.user_id,
      sessionUserId: session?.user?.id || null,
      sessionError
    })
  }

  log('local', `Transaction stockee en fallback local: ${localId}`, { id: normalized.id })
  return persistTransactionFallback(normalized)
}

const update = async (transaction) => {
  const normalized = normalizeTransaction({ ...transaction, updated_at: new Date().toISOString() })
  const localId = normalized.metadata?.local_id

  if (!isLegacyCloudSyncEnabled()) {
    return persistTransactionFallback(normalized)
  }

  let session = null
  let sessionError = null
  try {
    const authState = await getSupabaseSession()
    session = authState.session
    sessionError = authState.error
  } catch (err) {
    sessionError = err
    console.warn('[Phase2C][TransactionsService] fallback activated: session unavailable for update', err)
  }

  if (session?.user?.id) {
    normalized.user_id = session.user.id
  }

  if (normalized.user_id && session?.user?.id && isOnline()) {
    try {
      const supabasePayload = toSupabaseTransactionPayload(normalized)
      const existing = await findSupabaseTransactionByLocalId(normalized.user_id, localId)

      if (!existing) {
        return create(normalized)
      }

      const { id, created_at, ...updatePayload } = supabasePayload
      const { data, error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', existing.id)
        .eq('user_id', normalized.user_id)
        .select()
        .single()

      if (error) throw error
      console.info('[Phase2C] update synced', { local_id: localId })
      return data
    } catch (err) {
      console.warn('[Phase2C] fallback activated: update sync error', err)
    }
  } else {
    console.warn('[Phase2C] fallback activated: update skipped', {
      reason: !isOnline()
        ? 'offline'
        : !session?.user?.id
          ? 'missing-real-supabase-session'
          : 'missing-user-id',
      local_id: localId,
      sessionError
    })
  }

  return persistTransactionFallback(normalized)
}

const remove = async ({ user_id, local_id, month, category } = {}) => {
  if (!local_id && !month) {
    console.warn('[Phase2C] delete skipped: missing local_id or month')
    return false
  }

  if (!isLegacyCloudSyncEnabled()) {
    return removeTransactionFallback({
      userId: user_id || getCurrentUser()?.id || null,
      localId: local_id,
      month,
      category
    })
  }

  let session = null
  let sessionError = null
  try {
    const authState = await getSupabaseSession()
    session = authState.session
    sessionError = authState.error
  } catch (err) {
    sessionError = err
    console.warn('[Phase2C][TransactionsService] fallback activated: session unavailable for delete', err)
  }

  const userId = session?.user?.id || user_id || getCurrentUser()?.id || null

  if (userId && session?.user?.id && isOnline()) {
    try {
      let query = supabase.from('transactions').delete().eq('user_id', userId)
      if (local_id) {
        query = query.eq('local_id', local_id)
      } else {
        query = query.eq('month', month)
        if (category) query = query.eq('category', category)
      }

      const { error } = await query
      if (error) throw error
      console.info('[Phase2C] delete synced', { local_id, month, category })
    } catch (err) {
      console.warn('[Phase2C] fallback activated: delete sync error', err)
    }
  } else {
    console.warn('[Phase2C] fallback activated: delete skipped', {
      reason: !isOnline()
        ? 'offline'
        : !session?.user?.id
          ? 'missing-real-supabase-session'
          : 'missing-user-id',
      local_id,
      month,
      sessionError
    })
  }

  return removeTransactionFallback({
    userId,
    localId: local_id,
    month,
    category
  })
}

const syncSupabaseToLocal = async () => {
  if (!isLegacyCloudSyncEnabled()) {
    return { synced: 0, skipped: 0, fallback: true, reason: 'legacy-cloud-sync-disabled' }
  }

  console.info('[Phase2D] sync started')

  if (!isOnline()) {
    console.warn('[Phase2D] fallback local: offline')
    return { synced: 0, skipped: 0, fallback: true, reason: 'offline' }
  }

  const storage = getStorageClient()
  if (!storage) {
    console.warn('[Phase2D] fallback local: storage unavailable')
    return { synced: 0, skipped: 0, fallback: true, reason: 'storage-unavailable' }
  }

  let session = null
  try {
    const authState = await getSupabaseSession()
    session = authState.session
    if (authState.error) throw authState.error
  } catch (err) {
    console.warn('[Phase2D] fallback local: session unavailable', err)
    return { synced: 0, skipped: 0, fallback: true, reason: 'session-unavailable' }
  }

  const userId = session?.user?.id
  if (!userId) {
    console.warn('[Phase2D] fallback local: session expired')
    return { synced: 0, skipped: 0, fallback: true, reason: 'session-expired' }
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('id,user_id,label,amount,type,category,month,paid,local_id,updated_at,synced_at')
      .order('updated_at', { ascending: true })

    if (error) throw error

    const transactions = Array.isArray(data)
      ? data.filter(transaction => !transaction.user_id || transaction.user_id === userId)
      : []
    const latestByLocalId = new Map()
    transactions.forEach((transaction) => {
      const { month, category } = getTransactionMonthAndCategory(transaction)
      if (!month || !category) return

      const localId = transaction.local_id || `${month}_${category}`
      const existing = latestByLocalId.get(localId)
      const existingUpdatedAt = existing?.updated_at || existing?.synced_at || ''
      const transactionUpdatedAt = transaction.updated_at || transaction.synced_at || ''

      if (!existing || transactionUpdatedAt >= existingUpdatedAt) {
        latestByLocalId.set(localId, transaction)
      }
    })

    const meta = readSupabaseToLocalMeta()
    const monthsToWrite = new Map()
    let synced = 0
    let skipped = 0

    latestByLocalId.forEach((transaction) => {
      const { month, category } = getTransactionMonthAndCategory(transaction)
      if (!month || !category) return

      const amount = normalizeLocalAmount(transaction.amount)
      if (amount === null) return

      const localId = transaction.local_id || `${month}_${category}`
      const remoteUpdatedAt = transaction.updated_at || transaction.synced_at || null
      const monthData = monthsToWrite.get(month) || readBudgetMonthObject(storage, month)
      const localAmount = normalizeLocalAmount(monthData[category])

      if (localAmount !== null && localAmount !== amount) {
        skipped += 1
        meta[localId] = meta[localId] || { remote_updated_at: remoteUpdatedAt }
        console.info('[Phase2D] skipped local newer', { local_id: localId, month, category })
        monthsToWrite.set(month, monthData)
        return
      }

      monthData[category] = amount
      if (typeof transaction.paid === 'boolean') {
        monthData[`${category}_paye`] = transaction.paid ? amount : 0
      }
      meta[localId] = { remote_updated_at: remoteUpdatedAt }
      synced += 1
      monthsToWrite.set(month, monthData)
    })

    monthsToWrite.forEach((monthData, month) => {
      storage.setItem(storageKey(month), JSON.stringify(monthData))
    })
    writeSupabaseToLocalMeta(meta)

    console.info('[Phase2D] sync completed', { synced, skipped, months: monthsToWrite.size })
    return { synced, skipped, fallback: false, months: monthsToWrite.size }
  } catch (err) {
    console.warn('[Phase2D] fallback local: sync error', err)
    return { synced: 0, skipped: 0, fallback: true, reason: 'sync-error', error: err }
  }
}

// ─────────────────────────────────────────────
// TODO Phase 2B - Ecriture
// ─────────────────────────────────────────────
// TODO: create(month, key, value) - sauvegarder vers Supabase
// TODO: updateEntry(month, key, value) - mettre a jour une entree
// TODO: deleteMonth(month) - supprimer un mois
// TODO: batchSync(months) - sync en masse au login

// ─────────────────────────────────────────────
// TODO Phase 3 - Fonctionnalites avancees
// ─────────────────────────────────────────────
// TODO: enableRealtime() - Supabase Realtime multi-device
// TODO: smartCache(ttl) - cache TTL avec invalidation intelligente
// TODO: conflictResolution() - merge strategies multi-device
// TODO: analyticsEnhanced() - metriques avancees depuis Supabase
// TODO: ghostMode() - donnees demo pour nouveaux users
// TODO: exportHistory() - export PDF/CSV depuis Supabase
// TODO: pushNotifications() - alertes budget via PWA

export const TransactionsService = {
  getBudgetMonth,
  getBudgetMonthSync,
  getAvailableMonths,
  getSyncState,
  isLegacyCloudSyncEnabled,
  create,
  update,
  delete: remove,
  syncSupabaseToLocal,
  // Expose pour debug
  _readFromLocal: readFromLocal,
  _readFromSupabase: readFromSupabase
}
