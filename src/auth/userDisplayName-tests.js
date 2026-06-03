import { getUserDisplayName } from './userDisplayName.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

assert(getUserDisplayName(null) === 'Vous', 'null user → Vous')
assert(getUserDisplayName({ user_metadata: { first_name: 'Ali' } }) === 'Ali', 'first_name')
assert(getUserDisplayName({ user_metadata: { display_name: 'Mégane' } }) === 'Mégane', 'display_name')
assert(getUserDisplayName({ user_metadata: { full_name: 'Jean Dupont' } }) === 'Jean', 'full_name first word')
assert(getUserDisplayName({ email: 'alihakmaoui2017@example.com', user_metadata: {} }) === 'Ali', 'email fallback resolves to Ali')
assert(getUserDisplayName({ user_metadata: { username: 'alihakmaoui2017' } }) === 'Ali', 'username fallback resolves to Ali')

console.log('userDisplayName-tests: OK')
