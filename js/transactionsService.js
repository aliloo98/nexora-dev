/**
 * Nexora - TransactionsService
 * Phase 2A - Lecture prioritaire Supabase + fallback localStorage
 *
 * ARCHITECTURE OFFLINE-FIRST:
 * 1. Si authenticated + online → lit Supabase
 * 2. Si offline/erreur/non-auth → lit localStorage (SafeStorage)
 * 3. En arriere-plan : sync silent des donnees locales vers Supabase
 *
 * IMPORTANT: Ne modifie AUCUNE logique metier.
 * Les calculs (updateAll, buildHistory) restent inchanges.
 * Ce service est un PONT entre l'UI et la source de donnees.
 */

import { supabase } from '../src/supabase.js'
import AuthContext from '../src/auth/authContext.js'

// ─────────────────────────────────────────────
// DEBUG LOGGER (TEMPORAIRE - a retirer en prod)
// ─────────────────────────────────────────────
const DEBUG = true
const log = (type, msg, data) => {
  if (!DEBUG) return
  const icons = {
    success: '✅ [TX-SERVICE]',
    error:   '❌ [TX-SERVICE]',
    warn:    '⚠️  [TX-SERVICE]',
    info:    'ℹ️  [TX-SERVICE]',
    sync:    '🔄 [TX-SERVICE]',
    offline: '📴 [TX-SERVICE]',
    supa:    '☁️  [TX-SERVICE]',
    local:   '💾 [TX-SERVICE]'
  }
  console.log(`${icons[type] || icons.info} ${msg}`, data !== undefined ? data : '')
}

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

const storageKey = (month) => `budget_${month}`

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
    const months = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && k.startsWith('budget_')) {
        months.push(k.replace('budget_', ''))
      }
    }
    log('local', `Mois disponibles en local: ${months.length}`, months)
    return months
  } catch (err) {
    log('error', 'Erreur lecture mois locaux', err.message)
    return []
  }
}

// ─────────────────────────────────────────────
// LECTURE DEPUIS SUPABASE
// ─────────────────────────────────────────────
const readFromSupabase = async (month, userId) => {
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
  userId: getCurrentUser()?.id || null
})

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
  // Expose pour debug
  _readFromLocal: readFromLocal,
  _readFromSupabase: readFromSupabase
}
