/**
 * Habit Engine - Moteur de Détection des Habitudes
 * Détecte les régularités, anomalies, tendances de catégories et habitudes hebdomadaires.
 */

export function detectHabits(transactions = [], history = []) {
  const habits = []
  const categoryTrends = {}
  let weekendSpendSum = 0
  let totalSpendSum = 0

  if (Array.isArray(transactions) && transactions.length > 0) {
    transactions.forEach(t => {
      const amount = Number(t.amount || 0)
      const date = t.date ? new Date(t.date) : null
      const category = t.category || t.categoryKey || 'Général'

      totalSpendSum += amount
      if (date && (date.getDay() === 0 || date.getDay() === 6)) {
        weekendSpendSum += amount
      }

      if (!categoryTrends[category]) categoryTrends[category] = 0
      categoryTrends[category] += amount
    })

    // 1. Habitude hebdomadaire : Dépenses du week-end
    if (totalSpendSum > 0 && (weekendSpendSum / totalSpendSum) > 0.35) {
      const pctWeekend = Math.round((weekendSpendSum / totalSpendSum) * 100)
      habits.push({
        type: 'WEEKEND_SPENDING',
        pattern: 'WEEKEND_CONCENTRATION',
        confidence: 88,
        description: `Tu dépenses surtout le week-end (${pctWeekend}% de tes dépenses variables).`
      })
    }
  }

  // 2. Tendances de catégories sur l'historique
  if (Array.isArray(history) && history.length >= 2) {
    const recent = history[history.length - 1]
    const older = history[history.length - 2]
    
    if (recent.categories && older.categories) {
      Object.keys(recent.categories).forEach(cat => {
        const valRecent = Number(recent.categories[cat] || 0)
        const valOlder = Number(older.categories[cat] || 0)
        if (valOlder > 0 && valRecent > valOlder * 1.15) {
          const incPct = Math.round(((valRecent - valOlder) / valOlder) * 100)
          habits.push({
            type: 'CATEGORY_RISING',
            category: cat,
            confidence: 85,
            description: `Les dépenses ${cat} augmentent de ${incPct}% par rapport au mois dernier.`
          })
        } else if (valOlder > 0 && valRecent < valOlder * 0.85) {
          const decPct = Math.round(((valOlder - valRecent) / valOlder) * 100)
          habits.push({
            type: 'CATEGORY_DROPPING',
            category: cat,
            confidence: 85,
            description: `Ton budget ${cat} diminue de ${decPct}%.`
          })
        }
      })
    }
  }

  // 3. Habitude positive : Série de régularité
  if (Array.isArray(history) && history.length >= 3) {
    const streak = history.filter(h => (Number(h.revReel || 0) - Number(h.fixReel || 0) - Number(h.varReel || 0)) >= 0).length
    if (streak >= 3) {
      habits.push({
        type: 'BUDGET_STREAK',
        confidence: 95,
        description: `Tu tiens ton budget depuis ${streak} mois consécutifs !`
      })
    }
  }

  return habits
}
