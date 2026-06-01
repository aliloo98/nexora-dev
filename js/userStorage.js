/**
 * User-scoped storage helper
 *
 * Provides storage key namespacing for authenticated users so that
 * local fallback data cannot be accidentally shared between users.
 */
import AuthContext from '../src/auth/authContext.js'

const USER_NAMESPACE_TOKEN = '::user:'

const normalizeUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return null
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export const getCurrentUserId = () => {
  try {
    const user = AuthContext.getCurrentUser()
    return normalizeUserId(user?.id)
  } catch {
    return null
  }
}

export const getNamespacedStorageKey = (key, userId) => {
  const normalizedUserId = normalizeUserId(userId || getCurrentUserId())
  if (!normalizedUserId) return key
  if (String(key).includes(USER_NAMESPACE_TOKEN)) return key
  return `${key}${USER_NAMESPACE_TOKEN}${normalizedUserId}`
}

export default {
  getCurrentUserId,
  getNamespacedStorageKey
}
