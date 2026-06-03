const TECHNICAL_NAME_PATTERN = /^(TEST_|DEBUG_|TEMP_)/i

export function isTechnicalRecordName(name) {
  return TECHNICAL_NAME_PATTERN.test(String(name ?? '').trim())
}

export function filterUserFacingRecords(items = [], getName = (item) => item?.name) {
  if (!Array.isArray(items)) return []
  return items.filter((item) => !isTechnicalRecordName(getName(item)))
}

export default { isTechnicalRecordName, filterUserFacingRecords }
