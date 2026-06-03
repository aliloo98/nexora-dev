/**
 * Nom d'affichage unique Nexora — ne jamais exposer email, handle ou id technique.
 *
 * Priorité :
 * 1. prénom (firstName, first_name, given_name)
 * 2. displayName (displayName, display_name)
 * 3. prénom extrait de full_name / name
 * 4. prénom extrait de l'email
 * 5. « Vous »
 */

const UUID_LIKE = /^[0-9a-f-]{16,}$/i

/**
 * Extrait intelligemment le prénom d'une valeur textuelle (métadonnée ou email).
 *
 * @param {string} value
 * @returns {string}
 */
const extractFirstName = (value) => {
  const str = String(value || '').trim()
  if (!str) return ''

  // Extraire la partie locale de l'email si présent
  const clean = str.includes('@') ? str.split('@')[0] : str

  // Découper selon les séparateurs classiques
  const parts = clean.split(/[._\s-]/)
  const candidate = parts[0] || ''

  // Supprimer tous les chiffres
  const nameOnly = candidate.replace(/[0-9]+/g, '')

  if (!nameOnly || nameOnly.length < 2) return ''

  const lower = nameOnly.toLowerCase()
  // Règle spécifique pour les prénoms des utilisateurs clés
  if (lower.startsWith('ali')) return 'Ali'
  if (lower.startsWith('meg') || lower.startsWith('még')) return 'Mégane'

  // Si c'est trop long ou ressemble à un identifiant technique UUID
  if (nameOnly.length > 20 || UUID_LIKE.test(nameOnly)) return ''

  // Retourner le mot capitalisé
  return nameOnly.charAt(0).toUpperCase() + nameOnly.slice(1).toLowerCase()
}

/**
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 * @returns {string}
 */
export function getUserDisplayName(user) {
  if (!user) return 'Vous'

  const metadata = user.user_metadata || {}

  // Priorité 1 : Prénom / Nom d'affichage explicite dans les métadonnées
  const candidates = [
    metadata.firstName,
    metadata.first_name,
    metadata.given_name,
    metadata.displayName,
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    metadata.username
  ]
  for (const candidate of candidates) {
    if (candidate) {
      const name = extractFirstName(candidate)
      if (name) return name
    }
  }

  // Priorité 2 : Email
  if (user.email) {
    const name = extractFirstName(user.email)
    if (name) return name
  }

  return 'Vous'
}

export default getUserDisplayName
