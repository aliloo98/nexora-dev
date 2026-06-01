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
    const advice = {
      canAfford: impactEnding >= 0,
      impact: -price,
      endingBalance: Number(impactEnding.toFixed(2)),
      rationale: ''
    }

    if (advice.canAfford) {
      advice.rationale = `Achat possible. Solde estimé après achat: ${advice.endingBalance}€.`
    } else {
      advice.rationale = `Achat risqué. Solde estimé après achat: ${advice.endingBalance}€. Attendre un revenu ou reporter.`
    }

    return advice
  }
}

export default AdvisorService
