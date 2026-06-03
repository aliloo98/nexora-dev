/**
 * Nom d'affichage unique Nexora — ne jamais exposer email, handle ou id technique.
 *
 * Priorité :
 * 1. prénom (firstName, first_name, given_name)
 * 2. displayName (displayName, display_name)
 * 3. prénom extrait de full_name / name
 * 4. « Vous »
 */

const TECHNICAL_HANDLE = /^[a-z0-9_.-]{12,}$/i
const UUID_LIKE = /^[0-9a-f-]{16,}$/i
const EMAIL_LIKE = /@/

const isTechnicalValue = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return true
  if (EMAIL_LIKE.test(trimmed)) return true
  if (TECHNICAL_HANDLE.test(trimmed)) return true
  if (UUID_LIKE.test(trimmed)) return true
  return false
}

const firstWord = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed || isTechnicalValue(trimmed)) return ''
  const word = trimmed.split(/\s+/)[0]
  return isTechnicalValue(word) ? '' : word
}

/**
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 * @returns {string}
 */
export function getUserDisplayName(user) {
  if (!user) return 'Vous'

  const metadata = user.user_metadata || {}

  const givenCandidates = [
    metadata.firstName,
    metadata.first_name,
    metadata.given_name
  ]
  for (const candidate of givenCandidates) {
    const name = firstWord(candidate)
    if (name) return name
  }

  const displayCandidates = [
    metadata.displayName,
    metadata.display_name
  ]
  for (const candidate of displayCandidates) {
    const name = firstWord(candidate)
    if (name) return name
  }

  const fullCandidates = [
    metadata.full_name,
    metadata.name
  ]
  for (const candidate of fullCandidates) {
    const name = firstWord(candidate)
    if (name) return name
  }

  return 'Vous'
}

export default getUserDisplayName
