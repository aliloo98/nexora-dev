/**
 * Unit tests for RuleRegistry
 */

import { RuleRegistry } from './RuleRegistry.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`)
  }
}

function assertArrayEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`)
  }
}

function runTest(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(`  ${error.message}`)
    throw error
  }
}

export function runRuleRegistryTests() {
  console.log('\n=== RuleRegistry Tests ===\n')

  runTest('should create a new registry', () => {
    const registry = new RuleRegistry()
    assert(registry !== null, 'Registry should be created')
  })

  runTest('should register a single rule', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      condition: (ctx) => ctx.value > 10,
      message: (ctx) => 'Test message',
      priority: 50
    }
    
    registry.registerRule('alerts', rule)
    const rules = registry.getRules('alerts')
    
    assertEqual(rules.length, 1, 'Should have 1 rule')
    assertEqual(rules[0].id, 'test_rule', 'Rule ID should match')
  })

  runTest('should throw error for invalid category', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    
    let threwError = false
    try {
      registry.registerRule('', rule)
    } catch (error) {
      threwError = true
    }
    
    assert(threwError, 'Should throw error for empty category')
  })

  runTest('should throw error for invalid rule', () => {
    const registry = new RuleRegistry()
    
    let threwError = false
    try {
      registry.registerRule('alerts', null)
    } catch (error) {
      threwError = true
    }
    
    assert(threwError, 'Should throw error for null rule')
  })

  runTest('should throw error for rule without id', () => {
    const registry = new RuleRegistry()
    const rule = {
      category: 'alerts',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    
    let threwError = false
    try {
      registry.registerRule('alerts', rule)
    } catch (error) {
      threwError = true
    }
    
    assert(threwError, 'Should throw error for rule without id')
  })

  runTest('should throw error for rule without condition', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      message: (ctx) => 'Test',
      priority: 50
    }
    
    let threwError = false
    try {
      registry.registerRule('alerts', rule)
    } catch (error) {
      threwError = true
    }
    
    assert(threwError, 'Should throw error for rule without condition')
  })

  runTest('should throw error for rule without message', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      condition: (ctx) => true,
      priority: 50
    }
    
    let threwError = false
    try {
      registry.registerRule('alerts', rule)
    } catch (error) {
      threwError = true
    }
    
    assert(threwError, 'Should throw error for rule without message')
  })

  runTest('should throw error for duplicate rule id', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    
    registry.registerRule('alerts', rule)
    
    let threwError = false
    try {
      registry.registerRule('alerts', rule)
    } catch (error) {
      threwError = true
    }
    
    assert(threwError, 'Should throw error for duplicate rule id')
  })

  runTest('should register multiple rules', () => {
    const registry = new RuleRegistry()
    const rules = [
      {
        id: 'rule1',
        category: 'alerts',
        condition: (ctx) => ctx.value > 10,
        message: (ctx) => 'Message 1',
        priority: 50
      },
      {
        id: 'rule2',
        category: 'alerts',
        condition: (ctx) => ctx.value > 20,
        message: (ctx) => 'Message 2',
        priority: 70
      }
    ]
    
    registry.registerRules('alerts', rules)
    const retrievedRules = registry.getRules('alerts')
    
    assertEqual(retrievedRules.length, 2, 'Should have 2 rules')
  })

  runTest('should evaluate rules and return matches', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      condition: (ctx) => ctx.value > 10,
      message: (ctx) => `Value is ${ctx.value}`,
      priority: 50
    }
    
    registry.registerRule('alerts', rule)
    const matches = registry.evaluateRules({ value: 15 }, 'alerts')
    
    assertEqual(matches.length, 1, 'Should have 1 match')
    assertEqual(matches[0].message, 'Value is 15', 'Message should be generated')
  })

  runTest('should not match rules that fail condition', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      condition: (ctx) => ctx.value > 10,
      message: (ctx) => 'Test',
      priority: 50
    }
    
    registry.registerRule('alerts', rule)
    const matches = registry.evaluateRules({ value: 5 }, 'alerts')
    
    assertEqual(matches.length, 0, 'Should have 0 matches')
  })

  runTest('should sort matches by priority descending', () => {
    const registry = new RuleRegistry()
    const rules = [
      {
        id: 'low_priority',
        category: 'alerts',
        condition: (ctx) => true,
        message: (ctx) => 'Low',
        priority: 10
      },
      {
        id: 'high_priority',
        category: 'alerts',
        condition: (ctx) => true,
        message: (ctx) => 'High',
        priority: 90
      },
      {
        id: 'medium_priority',
        category: 'alerts',
        condition: (ctx) => true,
        message: (ctx) => 'Medium',
        priority: 50
      }
    ]
    
    registry.registerRules('alerts', rules)
    const matches = registry.evaluateRules({}, 'alerts')
    
    assertEqual(matches.length, 3, 'Should have 3 matches')
    assertEqual(matches[0].id, 'high_priority', 'First should be high priority')
    assertEqual(matches[1].id, 'medium_priority', 'Second should be medium priority')
    assertEqual(matches[2].id, 'low_priority', 'Third should be low priority')
  })

  runTest('should handle rule evaluation errors gracefully', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'error_rule',
      category: 'alerts',
      condition: (ctx) => {
        throw new Error('Test error')
      },
      message: (ctx) => 'Test',
      priority: 50
    }
    
    registry.registerRule('alerts', rule)
    const matches = registry.evaluateRules({}, 'alerts')
    
    assertEqual(matches.length, 0, 'Should have 0 matches (error handled)')
  })

  runTest('should clear category', () => {
    const registry = new RuleRegistry()
    const rule = {
      id: 'test_rule',
      category: 'alerts',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    
    registry.registerRule('alerts', rule)
    registry.clearCategory('alerts')
    const rules = registry.getRules('alerts')
    
    assertEqual(rules.length, 0, 'Should have 0 rules after clear')
  })

  runTest('should clear all rules', () => {
    const registry = new RuleRegistry()
    const rule1 = {
      id: 'rule1',
      category: 'alerts',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    const rule2 = {
      id: 'rule2',
      category: 'recommendations',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    
    registry.registerRule('alerts', rule1)
    registry.registerRule('recommendations', rule2)
    registry.clearAll()
    
    assertEqual(registry.getRules('alerts').length, 0, 'Alerts should be cleared')
    assertEqual(registry.getRules('recommendations').length, 0, 'Recommendations should be cleared')
  })

  runTest('should get all categories', () => {
    const registry = new RuleRegistry()
    const rule1 = {
      id: 'rule1',
      category: 'alerts',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    const rule2 = {
      id: 'rule2',
      category: 'recommendations',
      condition: (ctx) => true,
      message: (ctx) => 'Test',
      priority: 50
    }
    
    registry.registerRule('alerts', rule1)
    registry.registerRule('recommendations', rule2)
    const categories = registry.getCategories()
    
    assertArrayEqual(categories.sort(), ['alerts', 'recommendations'].sort(), 'Should have both categories')
  })

  console.log('\n=== All RuleRegistry tests passed ===\n')
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' || typeof global !== 'undefined') {
  runRuleRegistryTests()
}
