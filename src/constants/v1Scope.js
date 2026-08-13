/**
 * V1 Scope Configuration
 * 
 * Centralizes V1 scope reduction flags for features that are out of scope
 * in the current version but preserved for future restoration.
 * 
 * This provides a single source of truth for scope toggles without
 * building a large feature-flag system.
 */

export const V1_SCOPE = {
  // Couple mode is out of scope for V1
  // Feature implementation is preserved in src/couple/ for future restoration
  COUPLE_MODE_ENABLED: false
}
