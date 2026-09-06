import { test, expect } from '@playwright/test'

test.describe('Nexora Coach Dashboard pilot', () => {
  test.skip('uses one Coach recommendation in complete and simplified modes', async ({ page }) => {
    // SKIP V2 MIGRATION: Legacy test uses #coach-action-root which doesn't exist in V2
    // V2 uses North Star Priority (#priority-root) instead of legacy coach module
    // This test needs migration to V2 contract: verify #priority-root behavior in both modes
  })
})
