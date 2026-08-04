/**
 * Tests unitaires pour les fonctions de calcul de la carte financière
 * calculateRemainingCharges, calculateProjectedBalance, getFinancialState
 */

import { calculateRemainingCharges, calculateProjectedBalance, getFinancialState, clearFinancialStateCache } from './monthlyMetrics.js'

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
  
  // Nettoyer le cache avant chaque test
  const clearCache = () => {
    clearFinancialStateCache()
  }
  
  // Test 1: Aucune charge
  test('calculateRemainingCharges avec aucune charge', () => {
    clearCache()
    const metrics = {
      categories: [],
      currentBalance: 1000
    }
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 0, 'Devrait retourner 0')
  })
  
  // Test 2: Uniquement des charges payées
  test('calculateRemainingCharges avec uniquement des charges payées', () => {
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
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
    clearCache()
    const metrics = {
      currentBalance: 1000,
      categories: [
        { type: 'fixed_expense', amount: 200, paidAmount: 0, name: 'Loyer' }
      ]
    }
    const result = getFinancialState(metrics)
    assertEqual(result.state, 'neutral', 'Devrait être neutre')
  })
  
  // Test 15: Cache performance
  test('Le cache améliore les performances', () => {
    clearCache()
    const metrics = {
      currentBalance: 1000,
      categories: [
        { type: 'fixed_expense', amount: 200, paidAmount: 0, name: 'Loyer' }
      ]
    }
    
    // Premier appel - devrait remplir le cache
    const start1 = Date.now()
    const result1 = calculateRemainingCharges(metrics)
    const time1 = Date.now() - start1
    
    // Deuxième appel - devrait utiliser le cache
    const start2 = Date.now()
    const result2 = calculateRemainingCharges(metrics)
    const time2 = Date.now() - start2
    
    assertEqual(result1, result2, 'Les résultats devraient être identiques')
    assertLessThan(time2, time1 + 1, 'Le deuxième appel devrait être au moins aussi rapide')
  })
  
  // Test 16: clearFinancialStateCache
  test('clearFinancialStateCache vide le cache', () => {
    const metrics = {
      currentBalance: 1000,
      categories: [
        { type: 'fixed_expense', amount: 200, paidAmount: 0, name: 'Loyer' }
      ]
    }
    
    calculateRemainingCharges(metrics)
    clearFinancialStateCache()
    
    // Après clear, le cache devrait être vide
    const result = calculateRemainingCharges(metrics)
    assertEqual(result, 200, 'Devrait recalculer correctement après clear')
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