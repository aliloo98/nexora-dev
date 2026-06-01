import TreasuryService from '../treasury/treasuryService.js'

/**
 * Simple Nexora Advisor skeleton
 * Evaluates short requests like "Can I buy X for Y€" using treasury projections
 */
export const AdvisorService = {
  async evaluatePurchase({ price, baseBalance = 0, revenues = [], charges = [], fromDate = new Date(), days = 30 }) {
    // Build timeline and check ending balance
    const { timeline, endingBalance } = TreasuryService.buildTimeline({ baseBalance, revenues, charges, fromDate, days })
    const impactEnding = endingBalance - price
    const canAfford = impactEnding >= 0
    const advice = {
      canAfford,
      verdict: canAfford ? 'ok' : 'no',
      impact: -price,
      endingBalance: Number(impactEnding.toFixed(2)),
      risk: impactEnding < 0 ? 'haut' : (impactEnding < 50 ? 'moyen' : 'faible'),
      advice: ''
    }

    if (advice.verdict === 'ok') {
      advice.advice = `Achat possible. Solde estimé après achat: ${advice.endingBalance} €.`
    } else {
      advice.advice = `Achat risqué. Solde estimé après achat: ${advice.endingBalance} €. Envisagez de reporter ou de réduire le montant.`
    }

    return advice
  },

  /**
   * Simple rule-based query evaluator (no external LLM).
   * Returns structured response: { verdict, impact, risk, advice }
   */
  async evaluateQuery({ query = '', baseBalance = 0, revenues = [], charges = [], fromDate = new Date(), days = 30 } = {}) {
    const q = String(query || '').toLowerCase()
    // Purchase intent: "acheter" or "acheter un"
    const buyMatch = q.match(/(acheter|achete|peux[- ]?je acheter|puis[- ]?je acheter)\s.*?(\d+[\.,]?\d{0,2})/i)
    if (buyMatch) {
      const priceRaw = buyMatch[2].replace(',', '.')
      const price = Number(priceRaw)
      if (!Number.isFinite(price)) return { verdict: 'unknown', advice: 'Montant introuvable' }
      const res = await this.evaluatePurchase({ price, baseBalance, revenues, charges, fromDate, days })
      // return structured purchase response
      return { intent: 'purchase', verdict: res.verdict || (res.canAfford ? 'ok' : 'no'), impact: res.impact, risk: res.risk, advice: res.advice || res.rationale, endingBalance: res.endingBalance }
    }

    // Simple budget health check
    if (/(finir le mois|finis le mois|mois dans le vert|dans le vert)/.test(q)) {
      const { timeline, endingBalance } = TreasuryService.buildTimeline({ baseBalance, revenues, charges, fromDate, days })
      const verdict = endingBalance >= 0 ? 'ok' : 'no'
      const risk = endingBalance < 0 ? 'haut' : (endingBalance < 50 ? 'moyen' : 'faible')
      return { intent: 'month_health', verdict, endingBalance, risk, advice: verdict === 'ok' ? 'Prévisionnel OK' : 'Prévisionnel négatif, sécuriser des revenus ou reporter des dépenses' }
    }

    // Debt suggestion
    if (/(dette|rembourser|rembourser la dette)/.test(q)) {
      // Basic heuristic: recommend highest interest (placeholder)
      return { intent: 'debt', verdict: 'recommend', advice: 'Remboursez la dette avec le taux d’intérêt le plus élevé en priorité.' }
    }

    // Default fallback
    return { intent: 'unknown', verdict: 'unknown', advice: "Je n'ai pas compris la demande. Essaye: 'Puis-je acheter un vélo à 200€ ?'" }
  }
}

export default AdvisorService
