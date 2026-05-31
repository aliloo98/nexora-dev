/**
 * Nexora - BudgetCategoriesService
 * Phase 3A - Base technique pour categories budget dynamiques.
 *
 * Cette couche ne remplace pas encore l'UI ni les calculs historiques.
 * Les ids des categories par defaut restent alignes sur les data-key actuels
 * afin de conserver la compatibilite localStorage, Supabase CRUD et CSV.
 */

import { supabase } from '../src/supabase.js'
import AuthContext from '../src/auth/authContext.js'

const STORAGE_KEY = 'nexora_budget_categories_v1'
const LOCAL_USER_ID = 'local'
const TABLE_NAME = 'budget_categories'

const VALID_TYPES = ['income', 'fixed_expense', 'variable_expense']

export const DEFAULT_BUDGET_CATEGORIES = [
  { id: 'rev_ali', name: 'Revenu principal — Ali', type: 'income', position: 10, is_default: true, is_active: true },
  { id: 'rev_megane', name: 'Revenu principal — Megane', type: 'income', position: 20, is_default: true, is_active: true },
  { id: 'rev_excep', name: "Entrée d'argent exceptionnelle", type: 'income', position: 30, is_default: true, is_active: true },

  { id: 'loyer', name: 'Loyer', type: 'fixed_expense', position: 110, is_default: true, is_active: true },
  { id: 'credit', name: 'Crédit de surendettement', type: 'fixed_expense', position: 120, is_default: true, is_active: true },
  { id: 'assauto', name: 'Assurance voiture', type: 'fixed_expense', position: 130, is_default: true, is_active: true },
  { id: 'gasoil', name: 'Carburant / Gasoil', type: 'fixed_expense', position: 140, is_default: true, is_active: true },
  { id: 'elec', name: 'Électricité', type: 'fixed_expense', position: 150, is_default: true, is_active: true },
  { id: 'eau', name: 'Eau', type: 'fixed_expense', position: 160, is_default: true, is_active: true },
  { id: 'psy', name: 'Psy', type: 'fixed_expense', position: 170, is_default: true, is_active: true },
  { id: 'diete', name: 'Diététicienne', type: 'fixed_expense', position: 180, is_default: true, is_active: true },
  { id: 'itou', name: 'Médicaments pour Itou', type: 'fixed_expense', position: 190, is_default: true, is_active: true },
  { id: 'sante', name: 'Frais de santé divers', type: 'fixed_expense', position: 200, is_default: true, is_active: true },
  { id: 'impots', name: 'Impôts', type: 'fixed_expense', position: 210, is_default: true, is_active: true },
  { id: 'box', name: 'Box internet', type: 'fixed_expense', position: 220, is_default: true, is_active: true },
  { id: 'tel_ali', name: 'Téléphone — Ali', type: 'fixed_expense', position: 230, is_default: true, is_active: true },
  { id: 'tel_meg', name: 'Téléphone — Megane', type: 'fixed_expense', position: 240, is_default: true, is_active: true },
  { id: 'stream', name: 'Streaming', type: 'fixed_expense', position: 250, is_default: true, is_active: true },
  { id: 'ps', name: 'PlayStation', type: 'fixed_expense', position: 260, is_default: true, is_active: true },
  { id: 'cb', name: 'Carte bancaire', type: 'fixed_expense', position: 270, is_default: true, is_active: true },
  { id: 'impfix', name: 'Imprévu fixe / Exceptionnel', type: 'fixed_expense', position: 280, is_default: true, is_active: true },

  { id: 'courses', name: 'Courses', type: 'variable_expense', position: 310, is_default: true, is_active: true },
  { id: 'tabac', name: 'Tabac', type: 'variable_expense', position: 320, is_default: true, is_active: true },
  { id: 'sport', name: 'Salle de sport', type: 'variable_expense', position: 330, is_default: true, is_active: true },
  { id: 'ongles', name: 'Ongles — Megane', type: 'variable_expense', position: 340, is_default: true, is_active: true },
  { id: 'cadeaux', name: 'Cadeaux', type: 'variable_expense', position: 350, is_default: true, is_active: true },
  { id: 'impvar', name: 'Imprévu variable / Exceptionnel', type: 'variable_expense', position: 360, is_default: true, is_active: true }
]

// TODO Phase 3B: brancher une interface de renommage sur renameBudgetCategory().
// TODO Phase 3B: ajouter un bouton "ajouter une ligne" branche sur createBudgetCategory().
// TODO Phase 3B: ajouter un bouton "masquer une ligne" branche sur disableBudgetCategory().
// TODO Phase 3C: introduire un mode couple/foyer avec owner_id, household_id ou scope.
// TODO Phase 3C: gerer les categories partagees et les permissions par membre du foyer.

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine

const getCurrentUser = () => {
  try {
    const state = AuthContext.getState()
    return state?.isAuthenticated ? state.user : null
  } catch {
    return null
  }
}

const getStorageClient = () => {
  if (typeof SafeStorage !== 'undefined') return SafeStorage
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

const getSupabaseSession = async () => {
  const authResponse = await supabase.auth.getSession()
  return {
    session: authResponse.data?.session || null,
    error: authResponse.error || null
  }
}

const getOwnerId = (explicitUserId) => explicitUserId || getCurrentUser()?.id || LOCAL_USER_ID

const nowIso = () => new Date().toISOString()

const generateId = (type) => {
  const prefix = type === 'income' ? 'rev_custom' : type === 'fixed_expense' ? 'fix_custom' : 'var_custom'
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const assertValidType = (type) => {
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Type de categorie invalide: ${type}`)
  }
}

const normalizeCategory = (category, ownerId = LOCAL_USER_ID) => {
  const now = nowIso()
  const type = category.type || 'variable_expense'
  assertValidType(type)

  return {
    id: String(category.id || generateId(type)),
    user_id: category.user_id || ownerId,
    name: String(category.name || '').trim(),
    type,
    position: Number.isFinite(Number(category.position)) ? Number(category.position) : 0,
    is_default: Boolean(category.is_default),
    is_active: category.is_active !== false,
    created_at: category.created_at || now,
    updated_at: category.updated_at || now
  }
}

const defaultCategoriesForOwner = (ownerId) => (
  DEFAULT_BUDGET_CATEGORIES.map(category => normalizeCategory(category, ownerId))
)

const sortCategories = (categories) => (
  [...categories].sort((a, b) => {
    if (a.type !== b.type) return VALID_TYPES.indexOf(a.type) - VALID_TYPES.indexOf(b.type)
    return a.position - b.position || a.name.localeCompare(b.name)
  })
)

const readLocalStore = () => {
  try {
    const storage = getStorageClient()
    if (!storage) return {}
    const raw = storage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    console.warn('[BudgetCategoriesService] fallback read failed:', err)
    return {}
  }
}

const writeLocalStore = (store) => {
  try {
    const storage = getStorageClient()
    if (!storage) return false
    storage.setItem(STORAGE_KEY, JSON.stringify(store))
    return true
  } catch (err) {
    console.warn('[BudgetCategoriesService] fallback write failed:', err)
    return false
  }
}

const mergeWithDefaults = (categories, ownerId) => {
  const byId = new Map()
  defaultCategoriesForOwner(ownerId).forEach(category => byId.set(category.id, category))
  categories.forEach(category => {
    const normalized = normalizeCategory(category, ownerId)
    byId.set(normalized.id, normalized)
  })
  return sortCategories([...byId.values()])
}

const readLocalCategories = (ownerId) => {
  const store = readLocalStore()
  const ownerCategories = Array.isArray(store[ownerId]) ? store[ownerId] : null
  const localCategories = Array.isArray(store[LOCAL_USER_ID]) ? store[LOCAL_USER_ID] : []
  const categories = ownerCategories || localCategories
  const merged = mergeWithDefaults(categories, ownerId)
  store[ownerId] = merged
  writeLocalStore(store)
  return merged
}

const writeLocalCategories = (ownerId, categories) => {
  const store = readLocalStore()
  const normalized = sortCategories(categories.map(category => normalizeCategory(category, ownerId)))
  store[ownerId] = normalized
  if (ownerId !== LOCAL_USER_ID) {
    store[LOCAL_USER_ID] = normalized.map(category => normalizeCategory(category, LOCAL_USER_ID))
  }
  writeLocalStore(store)
  return normalized
}

const readSupabaseCategories = async (userId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,user_id,name,type,position,is_default,is_active,created_at,updated_at')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) throw error
  return Array.isArray(data) ? data : []
}

const isDevMode = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
const isBudgetCategoriesTableMissing = (err) => {
  const status = err?.status || err?.statusCode
  const code = err?.code
  const message = String(err?.message || err || '')
  return status === 404 || code === 'PGRST205' || /budget_categories/i.test(message) && /not found|could not find|relation .* does not exist/i.test(message)
}

const logSupabaseFallback = (context, err) => {
  if (isBudgetCategoriesTableMissing(err)) {
    if (isDevMode && console.info) {
      console.info(`[BudgetCategoriesService] Supabase ${context} fallback (budget_categories table optional):`, err?.message || err)
    }
    return
  }

  if (!isDevMode) return
  if (console.warn) {
    console.warn(`[BudgetCategoriesService] Supabase ${context} fallback:`, err)
  }
}

const upsertSupabaseCategory = async (category) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(category, { onConflict: 'user_id,id' })
    .select()
    .single()

  if (error) throw error
  return data
}

const updateSupabaseCategory = async (id, userId, payload) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ ...payload, updated_at: nowIso() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Lecture safe des categories.
 * Supabase est prioritaire quand une vraie session existe, sinon fallback local.
 */
const getBudgetCategories = async ({ includeInactive = false, userId } = {}) => {
  const ownerId = getOwnerId(userId)
  let categories = readLocalCategories(ownerId)

  try {
    const { session } = await getSupabaseSession()
    const sessionUserId = session?.user?.id

    if (sessionUserId && isOnline()) {
      const remoteCategories = await readSupabaseCategories(sessionUserId)
      if (remoteCategories.length > 0) {
        categories = mergeWithDefaults(remoteCategories, sessionUserId)
        writeLocalCategories(sessionUserId, categories)
      }
    }
  } catch (err) {
    logSupabaseFallback('read', err)
  }

  return includeInactive ? categories : categories.filter(category => category.is_active)
}

const renameBudgetCategory = async (id, name, { userId } = {}) => {
  const cleanName = String(name || '').trim()
  if (!id) throw new Error('id categorie requis')
  if (!cleanName) throw new Error('nom categorie requis')

  const ownerId = getOwnerId(userId)
  const categories = readLocalCategories(ownerId)
  const category = categories.find(item => item.id === id)
  if (!category) throw new Error(`Categorie introuvable: ${id}`)

  const updated = { ...category, name: cleanName, updated_at: nowIso() }
  writeLocalCategories(ownerId, categories.map(item => item.id === id ? updated : item))

  try {
    const { session } = await getSupabaseSession()
    if (session?.user?.id && isOnline()) {
      return normalizeCategory(await upsertSupabaseCategory({ ...updated, user_id: session.user.id }), session.user.id)
    }
  } catch (err) {
    logSupabaseFallback('rename', err)
  }

  return updated
}

const createBudgetCategory = async ({ name, type, position, userId } = {}) => {
  const cleanName = String(name || '').trim()
  if (!cleanName) throw new Error('nom categorie requis')
  assertValidType(type)

  const ownerId = getOwnerId(userId)
  const categories = readLocalCategories(ownerId)
  const typeCategories = categories.filter(category => category.type === type)
  const nextPosition = Number.isFinite(Number(position))
    ? Number(position)
    : Math.max(0, ...typeCategories.map(category => category.position)) + 10

  const category = normalizeCategory({
    id: generateId(type),
    user_id: ownerId,
    name: cleanName,
    type,
    position: nextPosition,
    is_default: false,
    is_active: true
  }, ownerId)

  writeLocalCategories(ownerId, [...categories, category])

  try {
    const { session } = await getSupabaseSession()
    if (session?.user?.id && isOnline()) {
      const remoteCategory = { ...category, user_id: session.user.id }
      return normalizeCategory(await upsertSupabaseCategory(remoteCategory), session.user.id)
    }
  } catch (err) {
    logSupabaseFallback('create', err)
  }

  return category
}

const disableBudgetCategory = async (id, { userId } = {}) => {
  if (!id) throw new Error('id categorie requis')

  const ownerId = getOwnerId(userId)
  const categories = readLocalCategories(ownerId)
  const category = categories.find(item => item.id === id)
  if (!category) throw new Error(`Categorie introuvable: ${id}`)

  const updated = { ...category, is_active: false, updated_at: nowIso() }
  writeLocalCategories(ownerId, categories.map(item => item.id === id ? updated : item))

  try {
    const { session } = await getSupabaseSession()
    if (session?.user?.id && isOnline()) {
      return normalizeCategory(await upsertSupabaseCategory({ ...updated, user_id: session.user.id }), session.user.id)
    }
  } catch (err) {
    logSupabaseFallback('disable', err)
  }

  return updated
}

const restoreBudgetCategory = async (id, { userId } = {}) => {
  if (!id) throw new Error('id categorie requis')

  const ownerId = getOwnerId(userId)
  const categories = readLocalCategories(ownerId)
  const category = categories.find(item => item.id === id)
  if (!category) throw new Error(`Categorie introuvable: ${id}`)

  const updated = { ...category, is_active: true, updated_at: nowIso() }
  writeLocalCategories(ownerId, categories.map(item => item.id === id ? updated : item))

  try {
    const { session } = await getSupabaseSession()
    if (session?.user?.id && isOnline()) {
      return normalizeCategory(await upsertSupabaseCategory({ ...updated, user_id: session.user.id }), session.user.id)
    }
  } catch (err) {
    logSupabaseFallback('restore', err)
  }

  return updated
}

const deleteBudgetCategory = async (id, { userId } = {}) => {
  if (!id) throw new Error('id categorie requis')

  const ownerId = getOwnerId(userId)
  const categories = readLocalCategories(ownerId)
  const category = categories.find(item => item.id === id)
  if (!category) throw new Error(`Categorie introuvable: ${id}`)

  if (category.is_default) {
    return disableBudgetCategory(id, { userId })
  }

  const remaining = categories.filter(item => item.id !== id)
  writeLocalCategories(ownerId, remaining)

  try {
    const { session } = await getSupabaseSession()
    if (session?.user?.id && isOnline()) {
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id).eq('user_id', session.user.id)
      if (error) throw error
    }
  } catch (err) {
    logSupabaseFallback('delete', err)
  }

  return true
}

export const BudgetCategoriesService = {
  DEFAULT_BUDGET_CATEGORIES,
  getBudgetCategories,
  renameBudgetCategory,
  createBudgetCategory,
  disableBudgetCategory,
  restoreBudgetCategory
  ,deleteBudgetCategory
}
