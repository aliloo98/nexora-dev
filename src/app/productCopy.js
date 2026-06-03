/** Libellés produit unifiés (états vides, placeholders). */
export const EMPTY_VALUE = '—'
export const EMPTY_DATA = 'Données à compléter'
export const EMPTY_LIST = 'Aucun élément pour le moment'
export const LOADING = 'Chargement…'

export const formatEuroDisplay = (value, { emptyLabel = EMPTY_VALUE } = {}) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return emptyLabel
  return `${Math.round(amount).toLocaleString('fr-FR')} €`
}

export default {
  EMPTY_VALUE,
  EMPTY_DATA,
  EMPTY_LIST,
  LOADING,
  formatEuroDisplay
}
