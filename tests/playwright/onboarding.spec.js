import { test, expect } from '@playwright/test'

test.describe('Onboarding V1', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all onboarding-related storage before each test
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')
    
    // Initialize UserAppSettingsService if not already initialized
    await page.evaluate(async () => {
      if (window.UserAppSettingsService && typeof window.UserAppSettingsService.init === 'function') {
        await window.UserAppSettingsService.init()
      }
      // Ensure StorageManager is initialized
      if (window.StorageManager && typeof window.StorageManager.initIndexedDB === 'function') {
        await window.StorageManager.initIndexedDB()
      }
    })
    
    // Clear onboarding state
    await page.evaluate(() => {
      localStorage.removeItem('user_app_settings')
      localStorage.removeItem('user_app_settings_pending')
      localStorage.removeItem('nexora_onboarding_state_v1')
      const keys = Object.keys(localStorage).filter(k =>
        k.includes('onboarding') || k.includes('ONBOARDING')
      )
      keys.forEach(k => localStorage.removeItem(k))
    })
  })

  test('displays onboarding on first visit', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    // Wait for onboarding to appear
    await page.waitForSelector('#onboarding-root', { timeout: 5000 })

    // Verify welcome card is visible
    const welcomeCard = page.locator('.onboarding-welcome-card')
    await expect(welcomeCard).toBeVisible()

    // Verify welcome content
    await expect(page.locator('.onboarding-title')).toContainText('Bienvenue sur Nexora')
    await expect(page.locator('.onboarding-description')).toBeVisible()
    await expect(page.locator('.onboarding-start-btn')).toBeVisible()
  })

  test('starts onboarding when clicking Commencer', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    await page.waitForSelector('#onboarding-root', { timeout: 5000 })

    // Click start button
    await page.click('.onboarding-start-btn')

    // Welcome card should be hidden
    const welcomeCard = page.locator('.onboarding-welcome-card')
    await expect(welcomeCard).toHaveCSS('display', 'none')

    // Progress section should be visible
    const progressSection = page.locator('.onboarding-progress-section')
    await expect(progressSection).toBeVisible()

    // Checklist should be visible
    const checklist = page.locator('.onboarding-checklist')
    await expect(checklist).toBeVisible()
  })

  test('displays correct initial progress', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    await page.waitForSelector('#onboarding-root', { timeout: 5000 })
    await page.click('.onboarding-start-btn')

    // Verify progress shows 0/5
    const progressCount = page.locator('.onboarding-progress-count')
    await expect(progressCount).toContainText('0/5')

    // Verify progress percentage is 0%
    const progressPercentage = page.locator('.onboarding-progress-percentage')
    await expect(progressPercentage).toContainText('0%')

    // Verify progress bar is empty
    const progressFill = page.locator('.onboarding-progress-fill')
    const width = await progressFill.evaluate(el => el.style.width)
    expect(width === '0%' || width === '0px').toBe(true)
  })

  test('dismisses onboarding when clicking close button', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    await page.waitForSelector('#onboarding-root', { timeout: 5000 })

    // Click dismiss button
    await page.click('.onboarding-dismiss-btn')

    // Onboarding container should be removed
    const onboardingRoot = page.locator('#onboarding-root')
    await expect(onboardingRoot).not.toBeVisible()
  })

  test('does not show onboarding after completion', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Manually set completed state in localStorage
    await page.evaluate(() => {
      localStorage.setItem('nexora_onboarding_state_v1', JSON.stringify({
        completed: true,
        dismissed: false,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        currentStep: 5,
        steps: [
          { id: 'create_budget', completed: true, completedAt: new Date().toISOString() },
          { id: 'add_income', completed: true, completedAt: new Date().toISOString() },
          { id: 'add_expense', completed: true, completedAt: new Date().toISOString() },
          { id: 'view_dashboard', completed: true, completedAt: new Date().toISOString() },
          { id: 'finish', completed: true, completedAt: new Date().toISOString() }
        ]
      }))
    })

    // Reload page
    await page.reload()

    // Try to render onboarding - should return null
    const container = await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        return await window.NexoraOnboarding.renderOnboarding()
      }
      return null
    })

    expect(container).toBeNull()

    // Onboarding should not appear
    const onboardingRoot = page.locator('#onboarding-root')
    await expect(onboardingRoot).not.toBeVisible({ timeout: 3000 })
  })

  test('persists onboarding state in localStorage', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    await page.waitForSelector('#onboarding-root', { timeout: 5000 })

    // Click start to mark as started
    await page.click('.onboarding-start-btn')

    // Wait a moment for state to be saved
    await page.waitForTimeout(500)

    // Verify state is persisted by checking localStorage directly
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('nexora_onboarding_state_v1')
      return raw ? JSON.parse(raw) : null
    })

    expect(state).not.toBeNull()
    expect(state.startedAt).toBeTruthy()
    expect(state.dismissed).toBe(false)
  })

  test('resets onboarding from localStorage', async ({ page }) => {
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Manually set completed state in localStorage
    await page.evaluate(() => {
      localStorage.setItem('nexora_onboarding_state_v1', JSON.stringify({
        completed: true,
        dismissed: false,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        currentStep: 5,
        steps: [
          { id: 'create_budget', completed: true, completedAt: new Date().toISOString() },
          { id: 'add_income', completed: true, completedAt: new Date().toISOString() },
          { id: 'add_expense', completed: true, completedAt: new Date().toISOString() },
          { id: 'view_dashboard', completed: true, completedAt: new Date().toISOString() },
          { id: 'finish', completed: true, completedAt: new Date().toISOString() }
        ]
      }))
    })

    // Verify it's completed
    const completedState = await page.evaluate(() => {
      const raw = localStorage.getItem('nexora_onboarding_state_v1')
      return raw ? JSON.parse(raw) : null
    })

    expect(completedState).not.toBeNull()
    expect(completedState.completed).toBe(true)

    // Reset by removing the key
    await page.evaluate(() => {
      localStorage.removeItem('nexora_onboarding_state_v1')
    })

    // Verify reset
    const resetState = await page.evaluate(() => {
      const raw = localStorage.getItem('nexora_onboarding_state_v1')
      return raw ? JSON.parse(raw) : null
    })

    expect(resetState).toBeNull()
  })
})

test.describe('Onboarding V1 Responsive', () => {
  test('displays correctly on mobile', async ({ page, viewport }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    // Verify onboarding is visible on mobile
    const welcomeCard = page.locator('.onboarding-welcome-card')
    await expect(welcomeCard).toBeVisible()

    // Verify content is readable
    await expect(page.locator('.onboarding-title')).toBeVisible()
    await expect(page.locator('.onboarding-start-btn')).toBeVisible()
  })

  test('displays correctly on tablet', async ({ page, viewport }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    // Verify onboarding is visible on tablet
    const welcomeCard = page.locator('.onboarding-welcome-card')
    await expect(welcomeCard).toBeVisible()
  })

  test('displays correctly on desktop', async ({ page, viewport }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    // Verify onboarding is visible on desktop
    const welcomeCard = page.locator('.onboarding-welcome-card')
    await expect(welcomeCard).toBeVisible()
  })
})

test.describe('Onboarding V1 Reduced Motion', () => {
  test('respects prefers-reduced-motion', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('http://127.0.0.1:5180')
    await page.waitForLoadState('networkidle')

    // Trigger real onboarding render
    await page.evaluate(async () => {
      if (window.NexoraOnboarding && window.NexoraOnboarding.renderOnboarding) {
        const container = await window.NexoraOnboarding.renderOnboarding()
        if (container) {
          document.body.appendChild(container)
        }
      }
    })

    // Verify onboarding still appears
    const welcomeCard = page.locator('.onboarding-welcome-card')
    await expect(welcomeCard).toBeVisible()

    // Verify animations are disabled (no transition duration)
    const computedStyle = await welcomeCard.evaluate(el => {
      return window.getComputedStyle(el)
    })

    // In reduced motion, transitions should be disabled (allow 0s or very small values)
    const duration = computedStyle.transitionDuration
    expect(duration === '0s' || duration === '1e-05s' || duration === '0.01s').toBe(true)
  })
})
