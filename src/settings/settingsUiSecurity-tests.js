import assert from 'node:assert/strict'
import { createActiveCoupleModeCard, createBillScheduleCard, createRecurringIncomeCard } from './settingsMarkup.js'
import { escapeHtml } from '../utils/htmlEscape.js'

const malicious = '\"><img src=x onerror=alert(1)><script>alert(2)</script>'
const escapedMalicious = '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(2)&lt;/script&gt;'

assert.equal(escapeHtml(malicious), escapedMalicious, 'HTML utility must escape text and attribute delimiters')

const assertMarkupIsEscaped = (markup, context) => {
  assert.equal(markup.includes(malicious), false, `${context} must not contain the raw payload`)
  assert.equal(markup.includes('<img'), false, `${context} must not create an injected image element`)
  assert.equal(markup.includes('<script>'), false, `${context} must not create an injected script element`)
  assert.ok(markup.includes(escapedMalicious), `${context} should preserve the payload as harmless text`)
}

assertMarkupIsEscaped(
  createRecurringIncomeCard({ name: malicious, amount: malicious, frequency: 'monthly', day: 1 }, 0),
  'recurring income card'
)
assertMarkupIsEscaped(
  createBillScheduleCard({ name: malicious, amount: malicious, day: 1, priority: 'standard' }, 0),
  'bill schedule card'
)
assertMarkupIsEscaped(
  createActiveCoupleModeCard({ household: { name: malicious }, partnerLabel: malicious, invitationCode: malicious }),
  'active couple card'
)

console.info('settingsUiSecurity-tests: user-provided settings markup is escaped — OK')
