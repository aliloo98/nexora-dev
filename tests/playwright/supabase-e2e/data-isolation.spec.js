import { test, expect } from '@playwright/test'
import { pollForEmail } from './helpers/mailbox.js'
import { 
  createAdminClient, 
  createUserClient,
  verifyRowOwnership,
  getUserRecords,
  attemptCrossUserSelect,
  attemptCrossUserUpdate,
  attemptCrossUserDelete
} from './helpers/supabaseTestClient.js'

// Generate unique test identifiers per run
const RUN_ID = Date.now().toString(36)
const ACCOUNT_A_USERNAME = `NexoraA${RUN_ID}`
const ACCOUNT_A_EMAIL = `nexora-ci-a-${RUN_ID}@example.test`
const ACCOUNT_A_PASSWORD = `TestPass123${RUN_ID}`
const ACCOUNT_B_USERNAME = `NexoraB${RUN_ID}`
const ACCOUNT_B_EMAIL = `nexora-ci-b-${RUN_ID}@example.test`
const ACCOUNT_B_PASSWORD = `TestPass456${RUN_ID}`

// Valid month keys for budget states (source-of-truth table: monthly_budget_states)
// Migration constraint: month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
// Uniqueness is on (user_id, month_key), so both A and B can use the same month_key
const SHARED_MONTH_KEY = '2026-08'

// Unique budget data
const A_BUDGET_DATA = { test_label: `NEXORA_CI_A_${RUN_ID}`, amount: 111.11 }
const B_BUDGET_DATA = { test_label: `NEXORA_CI_B_${RUN_ID}`, amount: 222.22 }

const readBrowserSupabaseSession = async (page) =>
  page.evaluate(async () => {
    const { supabase } = await import('/src/supabase.js')
    const { data, error } = await supabase.auth.getSession()

    return {
      userId: data?.session?.user?.id || null,
      accessToken: data?.session?.access_token || null,
      error: error?.message || null
    }
  })

test.describe('Real Supabase Data Isolation', () => {
  test.use({ serviceWorkers: 'allow' })

  let accountAUUID = null
  let accountBUUID = null
  let accountAToken = null
  let accountBToken = null
  let adminClient = null
  let aRecordId = null
  let bRecordId = null

  test.beforeAll(async () => {
    // Initialize admin client
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    }
    
    adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
  })

  test('Account A and B - complete data isolation with real Supabase', async ({ page, context, browser }) => {
    // ========================================================================
    // ACCOUNT A SETUP
    // ========================================================================
    console.log('Setting up Account A...')

    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()

    await pageA.goto('/')
    await pageA.waitForLoadState('networkidle')

    // Register Account A
    await pageA.getByRole('link', { name: 'S\'inscrire' }).click()
    await pageA.waitForSelector('#registerForm', { state: 'visible' })

    await pageA.fill('#registerUsername', ACCOUNT_A_USERNAME)
    await pageA.fill('#registerEmail', ACCOUNT_A_EMAIL)
    await pageA.fill('#registerPassword', ACCOUNT_A_PASSWORD)
    await pageA.fill('#registerPasswordConfirm', ACCOUNT_A_PASSWORD)
    
    const termsCheckbox = pageA.locator('#registerTerms')
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check()
    }

    // Capture timestamp BEFORE signup A (email may be emitted during submission)
    const signupTimestampA = Date.now()

    await pageA.click('#registerForm button[type="submit"]')
    await pageA.waitForTimeout(2000)

    // Confirm Account A
    const confirmationA = await pollForEmail({
      recipient: ACCOUNT_A_EMAIL,
      type: 'confirmation',
      afterTimestamp: signupTimestampA
    })
    expect(confirmationA.found).toBe(true)

    const confirmContextA = await browser.newContext()
    const confirmPageA = await confirmContextA.newPage()
    await confirmPageA.goto(confirmationA.link)
    await confirmPageA.waitForLoadState('networkidle')
    await confirmPageA.waitForTimeout(3000)
    await confirmContextA.close()

    // Login Account A
    await pageA.goto('/')
    await pageA.waitForLoadState('networkidle')

    await pageA.fill('#loginEmail', ACCOUNT_A_EMAIL)
    await pageA.fill('#loginPassword', ACCOUNT_A_PASSWORD)
    await pageA.click('#loginForm button[type="submit"]')

    await pageA.waitForSelector('#section-dashboard', { state: 'visible', timeout: 15000 })

    // Read the real authenticated Supabase session from the browser client.
    const accountASession = await readBrowserSupabaseSession(pageA)

    expect(accountASession.error).toBeNull()
    accountAUUID = accountASession.userId
    accountAToken = accountASession.accessToken

    expect(accountAUUID).toBeTruthy()
    expect(accountAToken).toBeTruthy()
    console.log('Account A UUID:', accountAUUID)

    // ========================================================================
    // ACCOUNT A FINANCIAL DATA CREATION (monthly_budget_states)
    // ========================================================================
    console.log('Creating Account A monthly budget state...')

    const userClientA = createUserClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      accountAToken
    )

    // Create A's budget state record (MUST succeed)
    const { data: budgetA, error: budgetAError } = await userClientA
      .from('monthly_budget_states')
      .insert({
        user_id: accountAUUID,
        month_key: SHARED_MONTH_KEY,
        data: A_BUDGET_DATA,
        data_version: 1
      })
      .select()
      .single()

    if (budgetAError) {
      throw new Error(`Failed to create A budget state: ${budgetAError.message}`)
    }

    expect(budgetA).toBeTruthy()
    aRecordId = budgetA.id
    console.log('Created A budget state:', aRecordId)

    // Verify A insert details
    expect(budgetA.user_id).toBe(accountAUUID)
    expect(budgetA.month_key).toBe(SHARED_MONTH_KEY)
    expect(budgetA.data).toEqual(A_BUDGET_DATA)
    console.log('A insert verified: user_id, month_key, data match expected ✓')

    // Verify ownership with admin client using exact record retrieval
    const aRecordAdmin = await adminClient
      .from('monthly_budget_states')
      .select('*')
      .eq('id', aRecordId)
      .single()
    expect(aRecordAdmin.data.user_id).toBe(accountAUUID)
    expect(aRecordAdmin.data.month_key).toBe(SHARED_MONTH_KEY)
    expect(aRecordAdmin.data.data).toEqual(A_BUDGET_DATA)
    console.log('A record verified via admin: user_id, month_key, data match expected ✓')

    // Logout A through the real user menu
    await pageA.locator('#userMenuBtn').click()
    await pageA.locator('#logoutBtn').click()
    await pageA.getByRole('button', { name: 'Confirmer' }).click()
    await pageA.waitForSelector('#loginForm', { state: 'visible', timeout: 10000 })

    // ========================================================================
    // ACCOUNT B SETUP
    // ========================================================================
    console.log('Setting up Account B...')

    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()

    await pageB.goto('/')
    await pageB.waitForLoadState('networkidle')

    // Register Account B
    await pageB.getByRole('link', { name: 'S\'inscrire' }).click()
    await pageB.waitForSelector('#registerForm', { state: 'visible' })

    await pageB.fill('#registerUsername', ACCOUNT_B_USERNAME)
    await pageB.fill('#registerEmail', ACCOUNT_B_EMAIL)
    await pageB.fill('#registerPassword', ACCOUNT_B_PASSWORD)
    await pageB.fill('#registerPasswordConfirm', ACCOUNT_B_PASSWORD)
    
    const termsCheckboxB = pageB.locator('#registerTerms')
    if (await termsCheckboxB.isVisible()) {
      await termsCheckboxB.check()
    }

    // Capture timestamp BEFORE signup B (email may be emitted during submission)
    const signupTimestampB = Date.now()

    await pageB.click('#registerForm button[type="submit"]')
    await pageB.waitForTimeout(2000)

    // Confirm Account B
    const confirmationB = await pollForEmail({
      recipient: ACCOUNT_B_EMAIL,
      type: 'confirmation',
      afterTimestamp: signupTimestampB
    })
    expect(confirmationB.found).toBe(true)

    const confirmContextB = await browser.newContext()
    const confirmPageB = await confirmContextB.newPage()
    await confirmPageB.goto(confirmationB.link)
    await confirmPageB.waitForLoadState('networkidle')
    await confirmPageB.waitForTimeout(3000)
    await confirmContextB.close()

    // Login Account B
    await pageB.goto('/')
    await pageB.waitForLoadState('networkidle')

    await pageB.fill('#loginEmail', ACCOUNT_B_EMAIL)
    await pageB.fill('#loginPassword', ACCOUNT_B_PASSWORD)
    await pageB.click('#loginForm button[type="submit"]')

    await pageB.waitForSelector('#section-dashboard', { state: 'visible', timeout: 15000 })

    // Read the real authenticated Supabase session from the browser client.
    const accountBSession = await readBrowserSupabaseSession(pageB)

    expect(accountBSession.error).toBeNull()
    accountBUUID = accountBSession.userId
    accountBToken = accountBSession.accessToken

    expect(accountBUUID).toBeTruthy()
    expect(accountBToken).toBeTruthy()
    console.log('Account B UUID:', accountBUUID)

    // Verify A and B have different UUIDs
    expect(accountAUUID).not.toBe(accountBUUID)
    console.log('UUIDs are different:', accountAUUID !== accountBUUID)

    // ========================================================================
    // ACCOUNT B FINANCIAL DATA CREATION (monthly_budget_states)
    // ========================================================================
    console.log('Creating Account B monthly budget state...')

    const userClientB = createUserClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      accountBToken
    )

    // Create B's budget state record (MUST succeed)
    const { data: budgetB, error: budgetBError } = await userClientB
      .from('monthly_budget_states')
      .insert({
        user_id: accountBUUID,
        month_key: SHARED_MONTH_KEY,
        data: B_BUDGET_DATA,
        data_version: 1
      })
      .select()
      .single()

    if (budgetBError) {
      throw new Error(`Failed to create B budget state: ${budgetBError.message}`)
    }

    expect(budgetB).toBeTruthy()
    bRecordId = budgetB.id
    console.log('Created B budget state:', bRecordId)

    // Verify B insert details
    expect(budgetB.user_id).toBe(accountBUUID)
    expect(budgetB.month_key).toBe(SHARED_MONTH_KEY)
    expect(budgetB.data).toEqual(B_BUDGET_DATA)
    console.log('B insert verified: user_id, month_key, data match expected ✓')

    // Verify ownership with admin client using exact record retrieval
    const bRecordAdmin = await adminClient
      .from('monthly_budget_states')
      .select('*')
      .eq('id', bRecordId)
      .single()
    expect(bRecordAdmin.data.user_id).toBe(accountBUUID)
    expect(bRecordAdmin.data.month_key).toBe(SHARED_MONTH_KEY)
    expect(bRecordAdmin.data.data).toEqual(B_BUDGET_DATA)
    console.log('B record verified via admin: user_id, month_key, data match expected ✓')

    // ========================================================================
    // DIRECT RLS TESTS - SELECT
    // ========================================================================
    console.log('Testing cross-user SELECT RLS...')

    // B attempts to SELECT A's record (MUST return zero rows via RLS)
    const bSelectA = await attemptCrossUserSelect(userClientB, 'monthly_budget_states', aRecordId)
    expect(bSelectA.error).toBe(null)
    expect(bSelectA.rowCount).toBe(0)
    console.log('B cannot SELECT A: 0 rows returned ✓')

    // A attempts to SELECT B's record (MUST return zero rows via RLS)
    const aSelectB = await attemptCrossUserSelect(userClientA, 'monthly_budget_states', bRecordId)
    expect(aSelectB.error).toBe(null)
    expect(aSelectB.rowCount).toBe(0)
    console.log('A cannot SELECT B: 0 rows returned ✓')

    // ========================================================================
    // DIRECT RLS TESTS - UPDATE
    // ========================================================================
    console.log('Testing cross-user UPDATE RLS...')

    // B attempts to UPDATE A's record (MUST affect zero rows via RLS)
    const bUpdateA = await attemptCrossUserUpdate(userClientB, 'monthly_budget_states', aRecordId, { data: { hacked: true } })
    expect(bUpdateA.error).toBe(null)
    expect(bUpdateA.affectedCount).toBe(0)
    console.log('B cannot UPDATE A: 0 rows affected ✓')

    // A attempts to UPDATE B's record (MUST affect zero rows via RLS)
    const aUpdateB = await attemptCrossUserUpdate(userClientA, 'monthly_budget_states', bRecordId, { data: { hacked: true } })
    expect(aUpdateB.error).toBe(null)
    expect(aUpdateB.affectedCount).toBe(0)
    console.log('A cannot UPDATE B: 0 rows affected ✓')

    // ========================================================================
    // DIRECT RLS TESTS - DELETE
    // ========================================================================
    console.log('Testing cross-user DELETE RLS...')

    // B attempts to DELETE A's record (MUST affect zero rows via RLS)
    const bDeleteA = await attemptCrossUserDelete(userClientB, 'monthly_budget_states', aRecordId)
    expect(bDeleteA.error).toBe(null)
    expect(bDeleteA.affectedCount).toBe(0)
    console.log('B cannot DELETE A: 0 rows affected ✓')

    // A attempts to DELETE B's record (MUST affect zero rows via RLS)
    const aDeleteB = await attemptCrossUserDelete(userClientA, 'monthly_budget_states', bRecordId)
    expect(aDeleteB.error).toBe(null)
    expect(aDeleteB.affectedCount).toBe(0)
    console.log('A cannot DELETE B: 0 rows affected ✓')

    // ========================================================================
    // FINAL VERIFICATION - RECORDS UNCHANGED
    // ========================================================================
    console.log('Verifying records unchanged after cross-user attempts...')

    const aRecordFinal = await adminClient
      .from('monthly_budget_states')
      .select('*')
      .eq('id', aRecordId)
      .single()
    expect(aRecordFinal.data.user_id).toBe(accountAUUID)
    expect(aRecordFinal.data.month_key).toBe(SHARED_MONTH_KEY)
    expect(aRecordFinal.data.data).toEqual(A_BUDGET_DATA)
    console.log('A record unchanged after cross-user attempts ✓')

    const bRecordFinal = await adminClient
      .from('monthly_budget_states')
      .select('*')
      .eq('id', bRecordId)
      .single()
    expect(bRecordFinal.data.user_id).toBe(accountBUUID)
    expect(bRecordFinal.data.month_key).toBe(SHARED_MONTH_KEY)
    expect(bRecordFinal.data.data).toEqual(B_BUDGET_DATA)
    console.log('B record unchanged after cross-user attempts ✓')

    // Cleanup
    await contextA.close()
    await contextB.close()

    console.log('All data isolation tests PASSED')
  })
})
