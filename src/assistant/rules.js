/**
 * Predefined rules for Assistant Nexora
 * 
 * These rules are automatically registered with the RuleRegistry.
 * To add new rules, add them to the appropriate category array.
 */

export const alertRules = [
  {
    id: 'missing_income',
    category: 'alerts',
    condition: (ctx) => ctx.income <= 0,
    message: (ctx) => 'Complétez votre budget pour obtenir une analyse.',
    priority: 100
  },
  {
    id: 'deficit',
    category: 'alerts',
    condition: (ctx) => ctx.savings < 0,
    message: (ctx) => `Attention, ce cycle risque de se terminer avec un déficit estimé de ${Math.abs(ctx.savings)} €.`,
    priority: 100
  },
  {
    id: 'high_charges',
    category: 'alerts',
    condition: (ctx) => ctx.chargesRate > 80,
    message: (ctx) => `Les charges totales représentent ${ctx.chargesRate}% des revenus.`,
    priority: 90
  },
  {
    id: 'high_debt_rate',
    category: 'alerts',
    condition: (ctx) => ctx.debtRate >= 30,
    message: (ctx) => `Votre taux d'endettement est de ${ctx.debtRate}%.`,
    priority: 95
  },
  {
    id: 'high_variable_expenses',
    category: 'alerts',
    condition: (ctx) => ctx.variableRate > 40,
    message: (ctx) => 'Dépenses variables élevées',
    priority: 50
  },
  {
    id: 'goal_zero',
    category: 'alerts',
    condition: (ctx) => ctx.primaryGoal && Number(ctx.primaryGoal.current || 0) === 0,
    message: (ctx) => `Objectif principal "${ctx.primaryGoal?.name || '—'}" à 0%`,
    priority: 80
  }
]

export const recommendationRules = [
  {
    id: 'rec_complete_budget',
    category: 'recommendations',
    condition: (ctx) => ctx.income <= 0,
    message: (ctx) => 'Saisissez vos revenus pour activer l\'analyse.',
    priority: 100
  },
  {
    id: 'rec_reduce_deficit',
    category: 'recommendations',
    condition: (ctx) => ctx.savings < 0,
    message: (ctx) => 'Priorisez la réduction des dépenses variables et des charges fixes avant de financer des objectifs.',
    priority: 100
  },
  {
    id: 'rec_reduce_charges',
    category: 'recommendations',
    condition: (ctx) => ctx.chargesRate > 80,
    message: (ctx) => 'Réduire 50 € de charges fixes améliorerait immédiatement votre taux d\'épargne.',
    priority: 90
  },
  {
    id: 'rec_reduce_variables',
    category: 'recommendations',
    condition: (ctx) => ctx.variableRate > 40,
    message: (ctx) => 'Réduisez environ 50 € de dépenses variables pour soulager votre budget.',
    priority: 50
  },
  {
    id: 'rec_reduce_debt',
    category: 'recommendations',
    condition: (ctx) => ctx.debtRate >= 30,
    message: (ctx) => 'Réduisez ou stabilisez les dettes avant d\'augmenter les objectifs.',
    priority: 95
  },
  {
    id: 'rec_start_goal',
    category: 'recommendations',
    condition: (ctx) => ctx.primaryGoal && Number(ctx.primaryGoal.current || 0) === 0,
    message: (ctx) => `Commencez à alimenter l'objectif ${ctx.primaryGoal?.name || '—'} avec une première contribution de 20 à 50 €.`,
    priority: 80
  },
  {
    id: 'rec_high_fixed',
    category: 'recommendations',
    condition: (ctx) => ctx.fixedRate > 50,
    message: (ctx) => {
      const targetFixed = Math.round(ctx.income * 0.5)
      const reductionNeeded = Math.max(0, ctx.fixedExpenses - targetFixed)
      return `Réduire environ ${reductionNeeded} € de charges fixes vous rapprocherait d'un niveau sain.`
    },
    priority: 70
  },
  {
    id: 'rec_savings_allocation',
    category: 'recommendations',
    condition: (ctx) => ctx.savings > 0 && !ctx.primaryGoal,
    message: (ctx) => {
      const safetyAllocation = Math.max(0, Math.round(ctx.savings * 0.6))
      return `Votre solde est positif : vous pouvez affecter environ ${safetyAllocation} € à vos objectifs ou à l'épargne tout en conservant une marge de sécurité.`
    },
    priority: 40
  },
  {
    id: 'rec_continue',
    category: 'recommendations',
    condition: (ctx) => ctx.hasData && ctx.savings >= 0,
    message: (ctx) => 'Continuez à mettre à jour vos paiements pour affiner l\'analyse.',
    priority: 10
  }
]

export const insightRules = [
  {
    id: 'ins_no_income',
    category: 'insights',
    condition: (ctx) => ctx.income <= 0,
    message: (ctx) => 'Aucun revenu saisi pour le mois.',
    priority: 100
  },
  {
    id: 'ins_income_savings',
    category: 'insights',
    condition: (ctx) => ctx.income > 0,
    message: (ctx) => `Revenus: ${ctx.income} € — Taux d'épargne estimé ${ctx.savingsRate}%`,
    priority: 50
  },
  {
    id: 'ins_positive_balance',
    category: 'insights',
    condition: (ctx) => ctx.income > 0 && ctx.savings >= 0,
    message: (ctx) => `Solde estimé positif: ${ctx.savings} €`,
    priority: 40
  },
  {
    id: 'ins_negative_balance',
    category: 'insights',
    condition: (ctx) => ctx.income > 0 && ctx.savings < 0,
    message: (ctx) => `Solde estimé négatif: ${ctx.savings} €`,
    priority: 60
  },
  {
    id: 'ins_debts',
    category: 'insights',
    condition: (ctx) => ctx.debts && ctx.debts.length > 0,
    message: (ctx) => `Dettes restantes : ${ctx.debtTotal} € — mensualités ${ctx.debtMonthlyTotal} €.`,
    priority: 50
  },
  {
    id: 'ins_goal_progress',
    category: 'insights',
    condition: (ctx) => ctx.primaryGoal,
    message: (ctx) => {
      const current = Number(ctx.primaryGoal.current || 0)
      const target = Number(ctx.primaryGoal.target || 0)
      const pct = target > 0 ? Math.round((current / target) * 100) : 0
      return `Objectif principal: ${ctx.primaryGoal.name || '—'} ${pct}% atteint`
    },
    priority: 40
  },
  {
    id: 'ins_fixed_rate',
    category: 'insights',
    condition: (ctx) => ctx.income > 0 && ctx.fixedExpenses > 0 && ctx.fixedRate > 30,
    message: (ctx) => `Les charges fixes représentent ${ctx.fixedRate}% des revenus.`,
    priority: 45
  },
  {
    id: 'ins_variable_controlled',
    category: 'insights',
    condition: (ctx) => ctx.income > 0 && ctx.variableExpenses > 0 && ctx.variableRate <= 25,
    message: (ctx) => 'Les dépenses variables sont maîtrisées.',
    priority: 30
  },
  {
    id: 'ins_variable_high',
    category: 'insights',
    condition: (ctx) => ctx.income > 0 && ctx.variableExpenses > 0 && ctx.variableRate > 40,
    message: (ctx) => 'Les dépenses variables sont élevées et pèsent sur votre capacité d\'épargne.',
    priority: 50
  },
  {
    id: 'ins_total_charges',
    category: 'insights',
    condition: (ctx) => ctx.income > 0 && ctx.totalExpenses > 0 && ctx.chargesRate > 70,
    message: (ctx) => `Les charges totales atteignent ${ctx.chargesRate}% des revenus.`,
    priority: 55
  }
]

/**
 * Register all predefined rules with the registry
 * @param {Object} registry - RuleRegistry instance
 */
export function registerPredefinedRules(registry) {
  registry.registerRules('alerts', alertRules)
  registry.registerRules('recommendations', recommendationRules)
  registry.registerRules('insights', insightRules)
}

export default {
  alertRules,
  recommendationRules,
  insightRules,
  registerPredefinedRules
}
