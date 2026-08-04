/**
 * Tests unitaires pour les fonctions de calcul de la carte financière
 * calculateRemainingCharges, calculateProjectedBalance, getFinancialState
 */

import { calculateRemainingCharges, calculateProjectedBalance, getFinancialState } from './monthlyMetrics.js'

function runFinancialCardTests() {
  console.log('🧪 Running Financial Card Tests')
  
  let passed = 0
  let failed = 0
  
  const test = (name, fn) => {
    try {
      fn()
      console.log(`✓ ${name}`)
      passed++
    } catch (error) {
      console.error(`✗ ${name}`, error.message)
      failed++
    }
  }
  
  const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`)
    }
  }
  
  const assertGreaterThan = (actual, expected, message) => {
    if (actual <= expected) {
      throw new Error(`${message}: expected > ${expected}, got ${actual}`)
    }
  }
  
  const assertLessThan = (actual, expected, message) => {
    if (actual >= expected) {
      throw new Error(`${message}: expected < ${expected}, got ${actual}`)
    }
  }
  
  // Test 1: Aucune charge
  test('calculateRemainingCharges avec aucune charge', () => {
    const metrics = {
      categories: [],
      currentBalance: 1000
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 0, 'Devrait retourner 0')
  })
  
  // Test 2: Uniquement des charges payées
  test('calculateRemainingCharges avec uniquement des charges payées', () => {
    const metrics = {
      categories: [
        { type: 'fixed_expense', amount: 100, paidAmount: 100, name: 'Loyer' },
        { type: 'variable_expense', amount: 50, paidAmount: 50, name: 'Courses' }
      ],
      currentBalance: 500
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 0, 'Devrait retourner 0 car tout est payé')
  })
  
  // Test 3: Uniquement des charges non payées
  test('calculateRemainingCharges avec uniquement des charges non payées', () => {
    const metrics = {
      categories: [
        { type: 'fixed_expense', amount: 100, paidAmount: 0, name: 'Loyer' },
        { type: 'variable_expense', amount: 50, paidAmount: 0, name: 'Courses' }
      ],
      currentBalance: 500
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 150, 'Devrait retourner 150 (100 + 50)')
  })
  
  // Test 4: Mélange charges payées / non payées
  test('calculateRemainingCharges avec mélange de charges', () => {
    const metrics = {
      categories: [
        { type: 'fixed_expense', amount: 100, paidAmount: 100, name: 'Loyer' },
        { type: 'fixed_expense', amount: 50, paidAmount: 0, name: 'Internet' },
        { type: 'variable_expense', amount: 30, paidAmount: 15, name: 'Courses' }
      ],
      currentBalance: 400
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 65, 'Devrait retourner 65 (50 + 15)')
  })
  
  // Test 5: Exclure les revenus
  test('calculateRemainingCharges exclut les revenus', () => {
    const metrics = {
      categories: [
        { type: 'income', amount: 2000, paidAmount: 0, name: 'Salaire' },
        { type: 'fixed_expense', amount: 100, paidAmount: 0, name: 'Loyer' }
      ],
      currentBalance: 1900
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 100, 'Devrait exclure le revenu et retourner 100')
  })
  
  // Test 6: Exclure les transferts internes
  test('calculateRemainingCharges exclut les transferts internes', () => {
    const metrics = {
      categories: [
        { type: 'fixed_expense', amount: 100, paidAmount: 0, name: 'Loyer' },
        { type: 'fixed_expense', amount: 50, paidAmount: 0, name: 'Transfert', internal_transfer: true }
      ],
      currentBalance: 400
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 100, 'Devrait exclure le transfert interne et retourner 100')
  })
  
  // Test 7: Exclure les analyses exclues
  test('calculateRemainingCharges exclut les analyses exclues', () => {
    const metrics = {
      categories: [
        { type: 'fixed_expense', amount: 100, paidAmount: 0, name: 'Loyer' },
        { type: 'variable_expense', amount: 50, paidAmount: 0, name: 'Remboursement', exclude_from_analytics: true }
      ],
      currentBalance: 400
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 100, 'Devrait exclure l\'analyse exclue et retourner 100')
  })
  
  // Test 8: Mois sans revenu
  test('calculateRemainingCharges fonctionne sans revenu', () => {
    const metrics = {
      categories: [
        { type: 'fixed_expense', amount: 100, paidAmount: 0, name: 'Loyer' }
      ],
      currentBalance: -100
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 100, 'Devrait fonctionner même sans revenu')
  })
  
  // Test 9: Plusieurs revenus dans le mois
  test('calculateRemainingCharges avec plusieurs revenus', () => {
    const metrics = {
      categories: [
        { type: 'income', amount: 2000, paidAmount: 0, name: 'Salaire' },
        { type: 'income', amount: 500, paidAmount: 0, name: 'Prime' },
        { type: 'fixed_expense', amount: 100, paidAmount: 0, name: 'Loyer' }
      ],
      currentBalance: 2400
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 100, 'Devrait exclure tous les revenus et retourner 100')
  })
  
  // Test 10: calculateProjectedBalance
  test('calculateProjectedBalance calcule correctement le solde', () => {
    const metrics = {
      currentBalance: 1000,
      categories: [
        { type: 'fixed_expense', amount: 200, paidAmount: 0, name: 'Loyer' }
      ]
    }
    const result = calculateProjectedBalance(metrics)
    assertEqual(result, 800, 'Devrait retourner 1000 - 200 = 800')
  })
  
  // Test 11: getFinancialState - État positif
  test('getFinancialState retourne l\'état positif quand charges = 0', () => {
    const metrics = {
      currentBalance: 500,
      categories: []
    }
    const result = getFinancialState(metrics)
    assertEqual(result.state, 'positive', 'Devrait être positif')
    assertEqual(result.showOpportunity, true, 'Devrait montrer une opportunité')
  })
  
  // Test 12: getFinancialState - État critique
  test('getFinancialState retourne l\'état critique quand solde négatif', () => {
    const metrics = {
      currentBalance: 100,
      categories: [
        { type: 'fixed_expense', amount: 200, paidAmount: 0, name: 'Loyer' }
      ]
    }
    const result = getFinancialState(metrics)
    assertEqual(result.state, 'critical', 'Devrait être critique')
    assertEqual(result.showOpportunity, false, 'Ne devrait pas montrer d\'opportunité')
  })
  
  // Test 13: getFinancialState - État warning
  test('getFinancialState retourne l\'état warning quand solde faible', () => {
    const metrics = {
      currentBalance: 1000,
      categories: [
        { type: 'fixed_expense', amount: 850, paidAmount: 0, name: 'Loyer' }
      ]
    }
    const result = getFinancialState(metrics)
    assertEqual(result.state, 'warning', 'Devrait être warning')
  })
  
  // Test 14: getFinancialState - État neutre
  test('getFinancialState retourne l\'état neutre pour situation normale', () => {
    const metrics = {
      currentBalance: 1000,
      categories: [
        { type: 'fixed_expense', amount: 200, paidAmount: 0, name: 'Loyer' }
      ]
    }
    const result = getFinancialState(metrics)
    assertEqual(result.state, 'neutral', 'Devrait être neutre')
  })
  
  // Test 15: Consistance des calculs
  test('Les calculs sont cohérents sur plusieurs appels', () => {
    const metrics = {
      currentBalance: 1000,
      categories: [
        { type: 'fixed_expense', amount: 200, paidAmount: 0, name: 'Loyer' }
      ]
    }
    
    const result1 = calculateRemainingCharges(metrics)
    const result2 = calculateRemainingCharges(metrics)
    const result3 = calculateRemainingCharges(metrics)
    
    assertEqual(result1, result2, 'Les résultats devraient être identiques')
    assertEqual(result2, result3, 'Les résultats devraient rester identiques')
    assertEqual(result1, 200, 'Le résultat devrait être correct')
  })
  
  console.log(`\n📊 Financial Card Tests: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`)
  }
}

// Exécuter les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runFinancialCardTests()
}

export { runFinancialCardTests }