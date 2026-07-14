export const ARRAY_SYNC_ENVELOPE_VERSION = 1
const ARRAY_SYNC_MARKER = '__nexora_array_sync'

const timestampFor = (value) => {
  const time = value ? new Date(value).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

export const getArrayItemTimestamp = (item) => {
  const value = item?.updated_at || item?.updatedAt || item?.modified_at || item?.created_at || item?.createdAt || 0
  return timestampFor(value)
}

export const getArrayItemIdentity = (item, index) => {
  if (!item || typeof item !== 'object') return `primitive:${String(item)}:${index}`
  const id = item.id || item.local_id || item.key || item.categoryKey
  if (id) return `id:${String(id).toLowerCase()}`
  const name = item.name || item.title || item.label
  const type = item.type || item.frequency || item.priority || ''
  if (name) return `name:${String(name).trim().toLowerCase()}::${String(type).trim().toLowerCase()}`
  return `index:${index}`
}

export const identitySetForArray = (items = []) => new Set(items.map((item, index) => getArrayItemIdentity(item, index)))

export const isStrictIdentitySubset = (candidate = [], reference = []) => {
  const candidateIds = identitySetForArray(candidate)
  const referenceIds = identitySetForArray(reference)
  if (candidateIds.size >= referenceIds.size) return false
  return [...candidateIds].every(identity => referenceIds.has(identity))
}

export const normalizeArrayTombstones = (tombstones = []) => {
  const latestByIdentity = new Map()
  ;(Array.isArray(tombstones) ? tombstones : []).forEach((tombstone) => {
    const identity = String(tombstone?.identity || '').trim()
    const deletedAt = String(tombstone?.deleted_at || '').trim()
    const deletedTime = timestampFor(deletedAt)
    if (!identity || !deletedTime) return
    const current = latestByIdentity.get(identity)
    if (!current || deletedTime > timestampFor(current.deleted_at)) {
      latestByIdentity.set(identity, { identity, deleted_at: new Date(deletedTime).toISOString() })
    }
  })
  return [...latestByIdentity.values()].sort((left, right) => left.identity.localeCompare(right.identity))
}

export const mergeArrayTombstones = (localTombstones = [], cloudTombstones = []) => (
  normalizeArrayTombstones([...localTombstones, ...cloudTombstones])
)

export const recordArrayDeletions = ({
  previousItems = [],
  nextItems = [],
  tombstones = [],
  updatedAt = new Date().toISOString()
} = {}) => {
  const deletionTime = timestampFor(updatedAt)
  const currentIds = identitySetForArray(nextItems)
  const tombstonesByIdentity = new Map(
    normalizeArrayTombstones(tombstones).map(tombstone => [tombstone.identity, tombstone])
  )

  identitySetForArray(previousItems).forEach((identity) => {
    if (currentIds.has(identity) || !deletionTime) return
    const existing = tombstonesByIdentity.get(identity)
    if (!existing || deletionTime > timestampFor(existing.deleted_at)) {
      tombstonesByIdentity.set(identity, { identity, deleted_at: new Date(deletionTime).toISOString() })
    }
  })

  currentIds.forEach(identity => tombstonesByIdentity.delete(identity))
  return normalizeArrayTombstones([...tombstonesByIdentity.values()])
}

export const applyArrayTombstones = (items = [], tombstones = [], { fallbackUpdatedAt = 0 } = {}) => {
  const fallbackTime = timestampFor(fallbackUpdatedAt)
  const deletedAtByIdentity = new Map(
    normalizeArrayTombstones(tombstones).map(tombstone => [tombstone.identity, timestampFor(tombstone.deleted_at)])
  )
  return (Array.isArray(items) ? items : []).filter((item, index) => {
    const deletedAt = deletedAtByIdentity.get(getArrayItemIdentity(item, index)) || 0
    const itemUpdatedAt = getArrayItemTimestamp(item) || fallbackTime
    return !deletedAt || deletedAt < itemUpdatedAt
  })
}

export const createArraySyncEnvelope = (items = [], tombstones = []) => ({
  [ARRAY_SYNC_MARKER]: ARRAY_SYNC_ENVELOPE_VERSION,
  items: Array.isArray(items) ? items : [],
  tombstones: normalizeArrayTombstones(tombstones)
})

export const decodeArraySyncEnvelope = (value) => {
  const isEnvelope = Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value[ARRAY_SYNC_MARKER] === ARRAY_SYNC_ENVELOPE_VERSION &&
    Array.isArray(value.items)
  )
  return {
    items: isEnvelope ? value.items : (Array.isArray(value) ? value : []),
    tombstones: isEnvelope ? normalizeArrayTombstones(value.tombstones) : [],
    isEnvelope
  }
}

export default {
  applyArrayTombstones,
  createArraySyncEnvelope,
  decodeArraySyncEnvelope,
  getArrayItemIdentity,
  getArrayItemTimestamp,
  identitySetForArray,
  isStrictIdentitySubset,
  mergeArrayTombstones,
  normalizeArrayTombstones,
  recordArrayDeletions
}
