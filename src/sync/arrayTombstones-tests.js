import assert from 'node:assert/strict'
import {
  applyArrayTombstones,
  createArraySyncEnvelope,
  decodeArraySyncEnvelope,
  getArrayItemIdentity,
  isStrictIdentitySubset,
  mergeArrayTombstones,
  recordArrayDeletions
} from './arrayTombstones.js'

const item = (id, updatedAt = '2026-07-01T10:00:00.000Z') => ({ id, name: id, updated_at: updatedAt })

assert.equal(getArrayItemIdentity(item('A'), 0), 'id:a', 'stable ids should be normalized for cross-device comparison')
assert.equal(isStrictIdentitySubset([item('a')], [item('a'), item('b')]), true, 'strict subset detection should recognize partial deletions')
assert.equal(isStrictIdentitySubset([item('a')], [item('b')]), false, 'independent additions must not be treated as deletions')

const legacy = decodeArraySyncEnvelope([item('legacy')])
assert.equal(legacy.isEnvelope, false, 'legacy cloud arrays must remain readable')
assert.equal(legacy.items[0].id, 'legacy', 'legacy items must survive decoding')
assert.deepEqual(legacy.tombstones, [], 'legacy arrays start without tombstones')

const firstDeletion = recordArrayDeletions({
  previousItems: [item('kept'), item('deleted')],
  nextItems: [item('kept')],
  updatedAt: '2026-07-02T10:00:00.000Z'
})
assert.deepEqual(firstDeletion, [
  { identity: 'id:deleted', deleted_at: '2026-07-02T10:00:00.000Z' }
], 'removing an item should create a timestamped tombstone')

const readded = recordArrayDeletions({
  previousItems: [item('kept')],
  nextItems: [item('kept'), item('deleted', '2026-07-03T10:00:00.000Z')],
  tombstones: firstDeletion,
  updatedAt: '2026-07-03T10:00:00.000Z'
})
assert.deepEqual(readded, [], 'explicitly re-adding an identity should clear its old tombstone')

const mergedTombstones = mergeArrayTombstones(
  [{ identity: 'id:deleted', deleted_at: '2026-07-02T10:00:00.000Z' }],
  [
    { identity: 'id:deleted', deleted_at: '2026-07-04T10:00:00.000Z' },
    { identity: 'id:other', deleted_at: 'invalid' }
  ]
)
assert.deepEqual(mergedTombstones, [
  { identity: 'id:deleted', deleted_at: '2026-07-04T10:00:00.000Z' }
], 'tombstone merge should keep only the latest valid deletion per identity')

assert.deepEqual(
  applyArrayTombstones(
    [item('deleted', '2026-07-03T10:00:00.000Z'), item('newer', '2026-07-05T10:00:00.000Z')],
    [
      { identity: 'id:deleted', deleted_at: '2026-07-04T10:00:00.000Z' },
      { identity: 'id:newer', deleted_at: '2026-07-04T10:00:00.000Z' }
    ]
  ).map(entry => entry.id),
  ['newer'],
  'a deletion should hide stale items but not a later explicit re-creation'
)

const envelope = createArraySyncEnvelope([item('kept')], mergedTombstones)
const decodedEnvelope = decodeArraySyncEnvelope(JSON.parse(JSON.stringify(envelope)))
assert.equal(decodedEnvelope.isEnvelope, true, 'versioned envelopes must be detected after JSON round-trip')
assert.equal(decodedEnvelope.items[0].id, 'kept', 'envelopes must preserve active items')
assert.deepEqual(decodedEnvelope.tombstones, mergedTombstones, 'envelopes must preserve normalized tombstones')

console.info('arrayTombstones-tests: versioned tombstone primitives are backward compatible — OK')
