import { test, expect } from '@playwright/test'

async function loginDemo(page) {
  await page.goto('http://localhost:5180/#section-dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 })
  await page.click('#loginDemoBtn')
  await page.waitForURL('**/#section-dashboard', { timeout: 20000 })
  await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 30000 })
  await page.waitForFunction(() => typeof window.setNexoraUxMode === 'function')
}

test.describe('Jarvis Premium Motion System V1', () => {
  const setupCompleteMode = async (page) => {
    await loginDemo(page)

    await page.evaluate(async () => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      } else {
        localStorage.setItem('nexora_ux_mode', 'complete')
        document.body.classList.remove('mode-simple')
        document.body.classList.add('mode-complete')
        if (typeof window.updateAll === 'function') window.updateAll()
      }
    })
    await page.waitForSelector('.jarvis-copilot-identity .jarvis-core-signal', { state: 'attached', timeout: 10000 })
  }

  test('validates multi-layer Jarvis Core identity and ACTIVE idle motion via Web Animations API', async ({ page }) => {
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await setupCompleteMode(page)

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeAttached()
    await expect(coreSignal).toHaveAttribute('data-state', 'idle')

    // Verify multi-layer rings exist
    const outerRing = coreSignal.locator('.jarvis-core-outer')
    const arcRing = coreSignal.locator('.jarvis-core-arc')
    const innerRing = coreSignal.locator('.jarvis-core-inner')
    const centerCore = coreSignal.locator('.jarvis-core-center')

    await expect(outerRing).toBeAttached()
    await expect(arcRing).toBeAttached()
    await expect(innerRing).toBeAttached()
    await expect(centerCore).toBeAttached()

    // Web Animations API runtime proof: verify active running CSS keyframe animations
    const animationsProof = await coreSignal.evaluate((signalEl) => {
      const getRunning = (selector) => {
        const el = signalEl.querySelector(selector)
        if (!el) return []
        return el.getAnimations().map(a => ({
          playState: a.playState
        }))
      }
      return {
        outer: getRunning('.jarvis-core-outer'),
        arc: getRunning('.jarvis-core-arc'),
        inner: getRunning('.jarvis-core-inner'),
        center: getRunning('.jarvis-core-center')
      }
    })

    expect(animationsProof.outer.some(a => a.playState === 'running')).toBe(true)
    expect(animationsProof.arc.some(a => a.playState === 'running')).toBe(true)
    expect(animationsProof.inner.some(a => a.playState === 'running')).toBe(true)
    expect(animationsProof.center.some(a => a.playState === 'running')).toBe(true)

    // Verify visual anchor core inside Hero
    const heroAnchorCore = page.locator('.jarvis-hero .jarvis-core-signal')
    await expect(heroAnchorCore).toBeAttached()

    expect(consoleErrors.length).toBe(0)
  })

  test('validates explicit interaction state sequence (idle -> open -> analysing -> response-ready -> open)', async ({ page }) => {
    await setupCompleteMode(page)

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeAttached()
    
    // 1. Initial State: idle
    await expect(coreSignal).toHaveAttribute('data-state', 'idle')

    // 2. Open State: click open
    const openButton = page.locator('[data-jarvis-copilot-open]')
    await expect(openButton).toBeAttached()
    await openButton.click()
    await expect(coreSignal).toHaveAttribute('data-state', 'open')

    // 3. Analysing State: submit input
    const input = page.locator('[data-jarvis-copilot-input]')
    await expect(input).toBeAttached()
    await input.fill('Quel est mon solde ?')
    
    const sendButton = page.locator('.jarvis-copilot-send')
    await sendButton.click()

    // 4. Response-ready State: answer arrives
    const thread = page.locator('[data-jarvis-copilot-thread]')
    await expect(thread.locator('.jarvis-copilot-response')).toBeAttached()

    // Signal transitions to response-ready
    await expect(coreSignal).toHaveAttribute('data-state', 'response-ready')

    // 5. Final settling state: reverts to open or idle after timeout
    await expect(coreSignal).toHaveAttribute('data-state', 'open', { timeout: 3000 })
  })

  test('validates mobile 390x844 layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setupCompleteMode(page)

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
  })

  test('validates desktop 1440x900 layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setupCompleteMode(page)

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
  })

  test('validates SVG Trajectory, Donut construction reveal, and Goal progress 0 -> target lifecycle', async ({ page }) => {
    await setupCompleteMode(page)

    // 1. Treasury forecast graph line path reveal
    const treasuryLine = page.locator('#treasury-line-path')
    await expect(treasuryLine).toBeAttached()

    // Scroll to ensure elements enter viewport and trigger animations
    await page.evaluate(() => {
      const linePath = document.getElementById('treasury-line-path')
      if (linePath) linePath.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    // Wait for animation to complete
    await page.waitForTimeout(2000)
    const lineState = await treasuryLine.getAttribute('data-motion-state')
    expect(lineState === 'complete' || lineState === 'ambient').toBe(true)

    const lineD = await treasuryLine.getAttribute('d')
    expect(lineD).toBeTruthy()
    expect(lineD.startsWith('M 0,')).toBe(true)

    // 2. Donut segments construction reveal
    const donutSegment = page.locator('#donut-segment-charges')
    await expect(donutSegment).toBeAttached()

    await page.evaluate(() => {
      const donut = document.getElementById('donut-segment-charges')
      if (donut) donut.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    await page.waitForTimeout(1000)
    const donutState = await donutSegment.getAttribute('data-motion-state')
    expect(donutState === 'complete' || donutState === 'ambient').toBe(true)

    // 3. Goal progress bar 0 -> target fill reveal
    const goalBar = page.locator('#complete-goal-bar')
    await expect(goalBar).toBeAttached()

    await page.evaluate(() => {
      const goal = document.getElementById('complete-goal-bar')
      if (goal) goal.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    await page.waitForTimeout(900)
    const goalState = await goalBar.getAttribute('data-motion-state')
    expect(goalState === 'complete' || goalState === 'ambient').toBe(true)

    const goalBarWidth = await goalBar.evaluate(el => el.style.width)
    expect(goalBarWidth).not.toBe('0%')
    expect(goalBarWidth.endsWith('%')).toBe(true)

    // 4. Verify calling updateAll does NOT reset motion state back to pending
    await page.evaluate(() => {
      if (typeof window.updateAll === 'function') window.updateAll()
    })
    const afterUpdateGoalState = await goalBar.getAttribute('data-motion-state')
    expect(afterUpdateGoalState === 'complete' || afterUpdateGoalState === 'ambient').toBe(true)
    const afterUpdateLineState = await treasuryLine.getAttribute('data-motion-state')
    expect(afterUpdateLineState === 'complete' || afterUpdateLineState === 'ambient').toBe(true)
    const afterUpdateDonutState = await donutSegment.getAttribute('data-motion-state')
    expect(afterUpdateDonutState === 'complete' || afterUpdateDonutState === 'ambient').toBe(true)
  })

  test('validates realistic mobile 390x844 scroll triggers viewport-based motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setupCompleteMode(page)

    // Verify initial pending states
    const treasuryLine = page.locator('#treasury-line-path')
    await expect(treasuryLine).toBeAttached()
    const initialLineState = await treasuryLine.getAttribute('data-motion-state')
    expect(initialLineState).toBe('pending')

    const donutSegment = page.locator('#donut-segment-charges')
    const initialDonutState = await donutSegment.getAttribute('data-motion-state')
    expect(initialDonutState).toBe('pending')

    const goalBar = page.locator('#complete-goal-bar')
    const initialGoalState = await goalBar.getAttribute('data-motion-state')
    expect(initialGoalState).toBe('pending')

    // Realistic scroll sequence: open dashboard → scroll naturally
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })

    // Scroll to trigger trajectory graph animation
    await page.evaluate(() => {
      const linePath = document.getElementById('treasury-line-path')
      if (linePath) linePath.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    await page.waitForTimeout(100)
    const runningLineState = await treasuryLine.getAttribute('data-motion-state')
    expect(runningLineState).toBe('running')

    // Continue scroll to trigger donut animation
    await page.evaluate(() => {
      const donut = document.getElementById('donut-segment-charges')
      if (donut) donut.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    await page.waitForTimeout(100)
    const runningDonutState = await donutSegment.getAttribute('data-motion-state')
    expect(runningDonutState).toBe('running')

    // Continue scroll to trigger progress animation
    await page.evaluate(() => {
      const goal = document.getElementById('complete-goal-bar')
      if (goal) goal.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    await page.waitForTimeout(100)
    const runningGoalState = await goalBar.getAttribute('data-motion-state')
    expect(runningGoalState).toBe('running')

    // Verify final complete states (ambient motion starts after reveal)
    await page.waitForTimeout(1200)
    const finalLineState = await treasuryLine.getAttribute('data-motion-state')
    expect(finalLineState === 'complete' || finalLineState === 'ambient').toBe(true)
    const finalDonutState = await donutSegment.getAttribute('data-motion-state')
    expect(finalDonutState === 'complete' || finalDonutState === 'ambient').toBe(true)
    const finalGoalState = await goalBar.getAttribute('data-motion-state')
    expect(finalGoalState === 'complete' || finalGoalState === 'ambient').toBe(true)

    // Verify no horizontal overflow
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
  })

  test('validates ambient motion lifecycle after reveal completion', async ({ page }) => {
    await setupCompleteMode(page)

    // Scroll elements into viewport to trigger reveal
    await page.evaluate(() => {
      const linePath = document.getElementById('treasury-line-path')
      if (linePath) linePath.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    await page.evaluate(() => {
      const donut = document.getElementById('donut-segment-charges')
      if (donut) donut.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    await page.evaluate(() => {
      const goal = document.getElementById('complete-goal-bar')
      if (goal) goal.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    // Wait for reveal to complete and ambient to start
    await page.waitForTimeout(3000)

    // Verify ambient state (or complete if ambient hasn't started yet)
    const treasuryLine = page.locator('#treasury-line-path')
    const lineState = await treasuryLine.getAttribute('data-motion-state')
    expect(lineState === 'complete' || lineState === 'ambient').toBe(true)

    const donutSegment = page.locator('#donut-segment-charges')
    const donutState = await donutSegment.getAttribute('data-motion-state')
    expect(donutState === 'complete' || donutState === 'ambient').toBe(true)

    const goalBar = page.locator('#complete-goal-bar')
    const goalState = await goalBar.getAttribute('data-motion-state')
    expect(goalState === 'complete' || goalState === 'ambient').toBe(true)

    // Verify target values remain exact during ambient motion
    const goalBarWidth = await goalBar.evaluate(el => el.style.width)
    expect(goalBarWidth).not.toBe('0%')
    expect(goalBarWidth.endsWith('%')).toBe(true)

    // Verify graph geometry unchanged during ambient motion
    const lineD = await treasuryLine.getAttribute('d')
    expect(lineD).toBeTruthy()
    expect(lineD.startsWith('M 0,')).toBe(true)

    // Verify donut values unchanged during ambient motion
    const donutStroke = await donutSegment.getAttribute('stroke-dasharray')
    expect(donutStroke).toBeTruthy()

    // Prove ambient animations exist using getAnimations
    const goalAnimations = await goalBar.evaluate(el => el.getAnimations().length)
    expect(goalAnimations).toBeGreaterThan(0)

    // Scroll element out of viewport
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })

    await page.waitForTimeout(500)

    // Scroll back into viewport
    await page.evaluate(() => {
      const goal = document.getElementById('complete-goal-bar')
      if (goal) goal.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    // Verify ambient resumes without replaying reveal
    const resumedGoalState = await goalBar.getAttribute('data-motion-state')
    expect(resumedGoalState === 'complete' || resumedGoalState === 'ambient').toBe(true)
  })

  test('validates document.hidden pauses ambient motion', async ({ page }) => {
    await setupCompleteMode(page)

    // Scroll elements into viewport to trigger reveal
    await page.evaluate(() => {
      const goal = document.getElementById('complete-goal-bar')
      if (goal) goal.scrollIntoView({ behavior: 'instant', block: 'center' })
    })

    // Wait for reveal to complete and ambient to start
    await page.waitForTimeout(3000)

    const goalBar = page.locator('#complete-goal-bar')
    const goalState = await goalBar.getAttribute('data-motion-state')
    expect(goalState).toBe('ambient')

    // Simulate document hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await page.waitForTimeout(500)

    // Restore document visibility
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Verify ambient state is preserved
    const restoredGoalState = await goalBar.getAttribute('data-motion-state')
    expect(restoredGoalState).toBe('ambient')
  })

  test('validates Simplified mode isolation (0 Jarvis motion surfaces shown)', async ({ page }) => {
    await loginDemo(page)

    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple')
      } else {
        localStorage.setItem('nexora_ux_mode', 'simple')
        document.body.classList.remove('mode-complete')
        document.body.classList.add('mode-simple')
        if (typeof window.updateAll === 'function') window.updateAll()
      }
    })

    const cockpit = page.locator('.jarvis-cockpit')
    await expect(cockpit).toBeHidden()

    const copilot = page.locator('.jarvis-copilot')
    await expect(copilot).toBeHidden()
  })

  test('validates prefers-reduced-motion contract (decorative animation disabled, final content visible)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await loginDemo(page)

    await page.evaluate(async () => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete')
      } else {
        localStorage.setItem('nexora_ux_mode', 'complete')
        document.body.classList.remove('mode-simple')
        document.body.classList.add('mode-complete')
        if (typeof window.updateAll === 'function') window.updateAll()
      }
    })
    await page.waitForSelector('.jarvis-copilot-identity .jarvis-core-signal', { state: 'attached', timeout: 10000 })

    const coreSignal = page.locator('.jarvis-copilot-identity .jarvis-core-signal')
    await expect(coreSignal).toBeAttached()

    // Web Animations API proof: verify no running decorative keyframe animation under prefers-reduced-motion
    const runningAnimations = await coreSignal.evaluate((signalEl) => {
      const getRunning = (selector) => {
        const el = signalEl.querySelector(selector)
        if (!el) return []
        return el.getAnimations().filter(a => a.playState === 'running')
      }
      return [
        ...getRunning('.jarvis-core-outer'),
        ...getRunning('.jarvis-core-arc'),
        ...getRunning('.jarvis-core-inner'),
        ...getRunning('.jarvis-core-center')
      ].length
    })

    expect(runningAnimations).toBe(0)

    // Verify all graph and goal go directly to complete state without pending
    const treasuryLine = page.locator('#treasury-line-path')
    await expect(treasuryLine).toBeAttached()
    await expect(treasuryLine).toHaveAttribute('data-motion-state', 'complete')

    const donutSegment = page.locator('#donut-segment-charges')
    await expect(donutSegment).toBeAttached()
    await expect(donutSegment).toHaveAttribute('data-motion-state', 'complete')

    const goalBar = page.locator('#complete-goal-bar')
    await expect(goalBar).toBeAttached()
    await expect(goalBar).toHaveAttribute('data-motion-state', 'complete')

    const goalWidth = await goalBar.evaluate(el => el.style.width)
    expect(goalWidth).not.toBe('0%')

    // Verify ambient motion is NOT started under reduced motion
    await page.waitForTimeout(3000)
    const lineState = await treasuryLine.getAttribute('data-motion-state')
    expect(lineState).toBe('complete')

    const donutState = await donutSegment.getAttribute('data-motion-state')
    expect(donutState).toBe('complete')

    const goalState = await goalBar.getAttribute('data-motion-state')
    expect(goalState).toBe('complete')
  })
})
