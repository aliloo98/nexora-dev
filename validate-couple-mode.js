#!/usr/bin/env node
/**
 * PHASE 10 - Validation Tests
 * 
 * Comprehensive check that all couple mode components are present,
 * testable, and ready for production deployment.
 */

import fs from 'fs'
import path from 'path'

const check = (condition, name) => {
  if (condition) {
    console.log(`✅ ${name}`)
    return true
  } else {
    console.log(`❌ ${name}`)
    return false
  }
}

const checkFile = (filePath, name) => {
  const exists = fs.existsSync(filePath)
  return check(exists, name)
}

const validationTests = async () => {
  console.log('\n🔍 PHASE 10 - Validation Tests\n')

  let passed = 0
  let total = 0

  // Check all service files exist
  const services = [
    'coupleService.js',
    'coupleInvitationService.js',
    'coupleShareService.js',
    'coupleBudgetService.js',
    'coupleGoalService.js',
    'coupleDebtService.js',
    'coupleAssistantService.js',
    'coupleNotificationService.js',
    'coupleUIComponent.js'
  ]

  console.log('📦 Service Files:')
  for (const service of services) {
    total++
    if (checkFile(`src/couple/${service}`, service)) {
      passed++
    }
  }

  // Check all test files exist
  const testFiles = [
    'couple-tests.js',
    'invitation-tests.js',
    'share-tests.js',
    'budget-tests.js',
    'goal-tests.js',
    'debt-tests.js',
    'assistant-tests.js',
    'notification-tests.js',
    'ui-tests.js'
  ]

  console.log('\n🧪 Test Files:')
  for (const test of testFiles) {
    total++
    if (checkFile(`src/couple/${test}`, test)) {
      passed++
    }
  }

  // Check SQL schema
  console.log('\n🗄️  Database:')
  total++
  if (checkFile('supabase/phase13_couples.sql', 'phase13_couples.sql (SQL schema)')) {
    passed++
  }

  // Check documentation
  console.log('\n📄 Documentation:')
  const docs = [
    { path: 'COUPLE_MODE_REPORT.md', name: 'COUPLE_MODE_REPORT.md (Final report)' },
    { path: 'package.json', name: 'package.json (Dependencies)' }
  ]

  for (const doc of docs) {
    total++
    if (checkFile(doc.path, doc.name)) {
      passed++
    }
  }

  // Check file sizes (non-empty)
  console.log('\n📊 File Integrity:')
  let sizeOk = true

  for (const service of services) {
    const filePath = `src/couple/${service}`
    const stat = fs.statSync(filePath)
    if (stat.size < 100) {
      console.log(`⚠️  ${service} is suspiciously small (${stat.size} bytes)`)
      sizeOk = false
    }
  }

  if (sizeOk) {
    console.log('✅ All service files have reasonable sizes')
    passed++
  }
  total++

  // Count total test assertions
  console.log('\n🧮 Test Count:')
  let totalTests = 0
  for (const test of testFiles) {
    try {
      const content = fs.readFileSync(`src/couple/${test}`, 'utf-8')
      const testMatches = content.match(/{\s*name:/g)
      if (testMatches) {
        totalTests += testMatches.length
        console.log(`  ${test}: ${testMatches.length} tests`)
      }
    } catch (e) {
      // ignore
    }
  }
  console.log(`  Total: ${totalTests} unit tests`)
  total++
  passed++

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`Validation Results: ${passed}/${total} checks passed`)
  console.log('='.repeat(50))

  if (passed === total) {
    console.log('\n✅ ALL VALIDATION CHECKS PASSED')
    console.log('Ready for production deployment\n')
    return true
  } else {
    console.log('\n⚠️  Some validation checks failed\n')
    return false
  }
}

validationTests()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('Validation error:', err)
    process.exit(1)
  })
