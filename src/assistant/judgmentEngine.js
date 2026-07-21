const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const safeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const normalizeSettings = (settings = {}) => ({
  thresholds: {
    chargesRate: safeNumber(settings?.thresholds?.chargesRate, 75),
    variableRate: safeNumber(settings?.thresholds?.variableRate, 35),
    minBalance: safeNumber(settings?.thresholds?.minBalance, 150)
  }
})

/**
 * Build a single, centralized judgment for the user's financial situation.
 * The engine always returns one primary problem, a short diagnostic, an impact,
 * a recommended action and the rationale for why it is priority.
 */
export function buildJudgmentEngine(context = {}) {
  const income = safeNumber(context.income)
  const fixedExpenses = safeNumber(context.fixedExpenses)
  const variableExpenses = safeNumber(context.variableExpenses)
  const expenses = safeNumber(context.expenses, fixedExpenses + variableExpenses)
  const projectedBalance = safeNumber(context.projectedBalance, income - expenses)
  const currentBalance = safeNumber(context.currentBalance, projectedBalance)
  const debts = Array.isArray(context.debts) ? context.debts : []
  const goals = Array.isArray(context.goals) ? context.goals : []
  const primaryGoal = context.primaryGoal || goals.find((goal) => goal?.isPrimary) || goals[0] || null
  const settings = normalizeSettings(context.settings)
  const chargesRate = income > 0 ? Math.round((expenses / income) * 100) : 0
  const variableRate = income > 0 ? Math.round((variableExpenses / income) * 100) : 0
  const debtMonthly = debts.reduce((sum, debt) => sum + safeNumber(debt?.monthly), 0)
  const debtBalance = debts.reduce((sum, debt) => sum + safeNumber(debt?.remaining), 0)
  const minBalance = Math.max(settings.thresholds.minBalance, 100)
  const problems = []

  if (income <= 0) {
    problems.push({ kind: 'income', priority: 1, label: 'Revenus non renseignés', severity: 'high' })
  }

  if (income > 0 && chargesRate > settings.thresholds.chargesRate) {
    problems.push({ kind: 'charges', priority: 1, label: 'Charges trop lourdes', severity: 'high' })
  }

  if (income > 0 && variableRate > settings.thresholds.variableRate) {
    problems.push({ kind: 'variables', priority: 2, label: 'Dépenses variables excessives', severity: 'medium' })
  }

  if (projectedBalance < 0) {
    problems.push({ kind: 'balance', priority: 3, label: 'Solde négatif à la fin du cycle', severity: 'high' })
  } else if (projectedBalance < minBalance) {
    problems.push({ kind: 'buffer', priority: 3, label: 'Marge de sécurité insuffisante', severity: 'medium' })
  }

  if (primaryGoal && safeNumber(primaryGoal.target) > safeNumber(primaryGoal.current)) {
    const remaining = Math.max(0, safeNumber(primaryGoal.target) - safeNumber(primaryGoal.current))
    problems.push({ kind: 'goal', priority: 4, label: `Objectif ${primaryGoal.name || 'principal'} en retard`, severity: 'medium', detail: remaining })
  }

  if (debtBalance > 0 && debtMonthly > 0) {
    problems.push({ kind: 'debt', priority: 5, label: 'Dette prioritaire à réduire', severity: 'medium' })
  }

  const primaryProblem = problems.sort((left, right) => left.priority - right.priority)[0] || { kind: 'stable', priority: 0, label: 'Situation stable', severity: 'low' }

  const diagnostic = primaryProblem.kind === 'income'
    ? 'Le budget ne peut pas encore être jugé : il manque les revenus de référence.'
    : primaryProblem.kind === 'charges'
      ? `Le diagnostic principal est la pression des charges : ${chargesRate}% des revenus sont absorbés.`
      : primaryProblem.kind === 'variables'
        ? `Le diagnostic principal est la hausse des dépenses variables : ${variableRate}% des revenus sont concernés.`
        : primaryProblem.kind === 'balance'
          ? `Le diagnostic principal est un solde négatif à la fin du cycle.`
          : primaryProblem.kind === 'buffer'
            ? `Le diagnostic principal est une marge trop faible pour sécuriser le mois.`
            : primaryProblem.kind === 'goal'
              ? `Le diagnostic principal est la progression trop lente vers l’objectif.`
              : primaryProblem.kind === 'debt'
                ? 'Le diagnostic principal est l’impact des dettes sur la liquidité.'
                : 'La situation semble stable et la priorité peut rester sur la continuité.'

  const impact = primaryProblem.kind === 'income'
    ? 'Sans revenus, toutes les décisions restent trop incertaines pour être prioritaires.'
    : primaryProblem.kind === 'charges'
      ? 'Cette pression réduit la marge disponible et fragilise les prochaines décisions.'
      : primaryProblem.kind === 'variables'
        ? 'Les dépenses variables grugent la flexibilité du mois et limitent l’épargne.'
        : primaryProblem.kind === 'balance'
          ? 'Le mois risque de se terminer dans le rouge, ce qui bloque toute nouvelle priorité.'
          : primaryProblem.kind === 'buffer'
            ? 'La marge de sécurité est trop faible pour absorber un imprévu.'
            : primaryProblem.kind === 'goal'
              ? 'L’objectif avance trop lentement et peut manquer sa fenêtre de temps.'
              : primaryProblem.kind === 'debt'
                ? 'La dette consomme une part du cash-flow qui devrait servir à la sécurité.'
                : 'La stabilité actuelle permet de protéger la marge plutôt que de réagir.'

  const action = primaryProblem.kind === 'income'
    ? 'Saisir au moins un revenu fiable.'
    : primaryProblem.kind === 'charges'
      ? 'Réduire les charges fixes ou reporter un engagement non prioritaire.'
      : primaryProblem.kind === 'variables'
        ? 'Limiter les dépenses variables cette semaine.'
        : primaryProblem.kind === 'balance'
          ? 'Réviser le budget pour éviter l’écart négatif.'
          : primaryProblem.kind === 'buffer'
            ? 'Protéger une réserve minimale avant toute nouvelle allocation.'
            : primaryProblem.kind === 'goal'
              ? 'Augmenter l’effort mensuel vers l’objectif prioritaire.'
              : primaryProblem.kind === 'debt'
                ? 'Prioriser le remboursement de la dette la plus coûteuse.'
                : 'Conserver la marge existante et éviter les dépenses non essentielles.'

  const why = primaryProblem.kind === 'income'
    ? 'Cette action est prioritaire parce qu’elle rend le jugement fiable.'
    : primaryProblem.kind === 'charges'
      ? 'Cette action est prioritaire parce que les charges fixes structurent la totalité du budget.'
      : primaryProblem.kind === 'variables'
        ? 'Cette action est prioritaire parce que les variables restent les plus flexibles à ajuster.'
        : primaryProblem.kind === 'balance'
          ? 'Cette action est prioritaire parce qu’un solde négatif bloque toute sécurité financière.'
          : primaryProblem.kind === 'buffer'
            ? 'Cette action est prioritaire parce que la marge de sécurité protège les autres décisions.'
            : primaryProblem.kind === 'goal'
              ? 'Cette action est prioritaire parce qu’elle réduit le retard et améliore la trajectoire.'
              : primaryProblem.kind === 'debt'
                ? 'Cette action est prioritaire parce qu’elle réduit le coût du crédit et libère du cash-flow.'
                : 'Cette action est prioritaire parce qu’elle préserver la stabilité tout en consolidant l’épargne.'

  return {
    diagnostic,
    impact,
    action,
    why,
    primaryProblem: {
      ...primaryProblem,
      priority: clamp(primaryProblem.priority, 1, 6)
    },
    problems: problems.sort((left, right) => left.priority - right.priority),
    summary: {
      income,
      expenses,
      projectedBalance,
      currentBalance,
      chargesRate,
      variableRate,
      debtMonthly,
      debtBalance,
      minBalance
    }
  }
}

export default { buildJudgmentEngine }
