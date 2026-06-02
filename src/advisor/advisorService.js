import TreasuryService from '../treasury/treasuryService.js'
import { collectFinancialContext, getProactiveCoach } from './proactiveCoachService.js'
import { generateScenarios } from './scenarioService.js'

const safeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => `${Math.round(safeNumber(value)).toLocaleString('fr-FR')} €`

const buildDecision = ({ verdict, today, why, impact, alternative, action, risk = 'modéré', advice }) => ({
  verdict,
  today,
  why,
  impact,
  alternative,
  action,
  risk,
  advice: advice || action,
  recommendation: action
})

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

  async getProactiveCoach(overrides = {}) {
    return getProactiveCoach(overrides)
  },

  async getScenarios(overrides = {}) {
    const context = await collectFinancialContext(overrides)
    return generateScenarios(context)
  },

  /**
   * Simple rule-based query evaluator (no external LLM).
   * Returns structured response: { verdict, impact, risk, advice }
   */
  async evaluateQuery({ query = '', baseBalance = null, revenues = [], charges = [], fromDate = new Date(), days = 30, ...overrides } = {}) {
    const q = String(query || '').toLowerCase()
    const context = await collectFinancialContext(overrides)
    const activeBaseBalance = baseBalance === null ? context.projectedBalance : safeNumber(baseBalance)
    const hasEnoughData = context.income > 0 || activeBaseBalance > 0 || revenues.length > 0

    const buyMatch = q.match(/(acheter|achete|achat|vacances|partir|payer).{0,80}?(\d+[\.,]?\d{0,2})/i)
    if (buyMatch) {
      const priceRaw = buyMatch[2].replace(',', '.')
      const price = Number(priceRaw)
      if (!Number.isFinite(price)) return { verdict: 'unknown', advice: 'Montant introuvable' }
      const cautionLevel = context.settings?.cautionLevel || 'balanced'
      const purchaseFloorPct = {
        very_cautious: 0.16,
        cautious: 0.12,
        balanced: 0.08,
        ambitious: 0.05,
        aggressive: 0.03
      }[cautionLevel] ?? 0.08
      const safetyFloor = Math.max(context.settings?.thresholds?.minBalance || 100, Math.round((context.income || activeBaseBalance) * purchaseFloorPct))
      const balanceAfter = activeBaseBalance - price
      const isLargePurchaseForProfile = cautionLevel === 'very_cautious' && context.income > 0 && price > context.income * 0.12
      const canAfford = hasEnoughData && balanceAfter >= safetyFloor && !isLargePurchaseForProfile
      const maxSaferBudget = Math.max(0, activeBaseBalance - safetyFloor)
      const cautiousText = cautionLevel === 'very_cautious'
        ? 'Non recommandé avec le niveau très prudent.'
        : cautionLevel === 'aggressive' && balanceAfter >= 0
          ? 'Possible si tu acceptes de réduire ta marge.'
          : canAfford
            ? 'Oui, si cet achat reste exceptionnel.'
            : 'Pas maintenant.'
      return {
        intent: 'purchase',
        canAfford,
        endingBalance: balanceAfter,
        ...buildDecision({
          verdict: canAfford ? 'ok' : 'no',
          today: cautiousText,
          why: hasEnoughData
            ? `Après cet achat, ta marge serait d’environ ${formatEuro(balanceAfter)}.`
            : 'Les revenus ou charges ne sont pas assez renseignés pour valider cet achat.',
          impact: `-${formatEuro(price)} sur ta marge disponible.`,
          alternative: maxSaferBudget > 0 ? `Budget plus sûr : ${formatEuro(maxSaferBudget)} maximum.` : 'Attends un revenu ou réduis une charge avant cet achat.',
          action: canAfford ? 'Valide l’achat puis garde le reste en sécurité.' : 'Crée un objectif dédié ou attends le prochain revenu.',
          risk: canAfford ? (balanceAfter < safetyFloor * 2 ? 'moyen' : 'faible') : 'haut'
        })
      }
    }

    // Simple budget health check
    if (/(finir le mois|finis le mois|mois dans le vert|dans le vert)/.test(q)) {
      const { endingBalance } = TreasuryService.buildTimeline({ baseBalance: activeBaseBalance, revenues, charges, fromDate, days })
      const verdict = endingBalance >= 0 ? 'ok' : 'no'
      const risk = endingBalance < 0 ? 'haut' : (endingBalance < 50 ? 'moyen' : 'faible')
      return {
        intent: 'month_health',
        endingBalance,
        ...buildDecision({
          verdict,
          today: verdict === 'ok' ? 'Oui, le mois semble rester positif.' : 'Non, le prévisionnel passe sous zéro.',
          why: `Solde de fin de période estimé : ${formatEuro(endingBalance)}.`,
          impact: endingBalance >= 0 ? `Marge restante : ${formatEuro(endingBalance)}.` : `Déficit à corriger : ${formatEuro(Math.abs(endingBalance))}.`,
          alternative: 'Réduis une dépense variable ou décale un achat non urgent.',
          action: verdict === 'ok' ? 'Garde ce rythme et surveille les prochaines échéances.' : 'Sécurise le solde avant de financer un objectif.',
          risk
        })
      }
    }

    if (/(dette|rembourser|rembourser la dette)/.test(q)) {
      const debts = (context.debts || []).filter((debt) => safeNumber(debt?.remaining) > 0)
      const priorityDebt = debts.slice().sort((a, b) => {
        const aMonthlyMissing = safeNumber(a?.monthly) <= 0 ? 1 : 0
        const bMonthlyMissing = safeNumber(b?.monthly) <= 0 ? 1 : 0
        return bMonthlyMissing - aMonthlyMissing || safeNumber(b?.remaining) - safeNumber(a?.remaining)
      })[0]
      if (!priorityDebt) {
        return buildDecision({
          verdict: 'recommend',
          today: 'Aucune dette active à prioriser.',
          why: 'Nexora ne détecte pas de dette restante.',
          impact: 'Ta marge peut aller vers l’épargne ou l’objectif principal.',
          alternative: 'Conserve une marge de sécurité avant d’augmenter l’épargne.',
          action: 'Vérifie le Plan si une dette manque.',
          risk: 'faible'
        })
      }
      return {
        intent: 'debt',
        debt: priorityDebt,
        ...buildDecision({
          verdict: 'recommend',
          today: `Priorise ${priorityDebt.name || 'la dette principale'}.`,
          why: safeNumber(priorityDebt.monthly) <= 0 ? 'Elle n’a pas encore de mensualité définie.' : `Il reste ${formatEuro(priorityDebt.remaining)} à rembourser.`,
          impact: `Mensualité actuelle : ${formatEuro(priorityDebt.monthly)}.`,
          alternative: 'Si ta marge est basse, garde la mensualité minimale et évite les achats non essentiels.',
          action: safeNumber(priorityDebt.monthly) <= 0 ? 'Ajoute une mensualité dans le Plan.' : 'Ajoute un petit remboursement seulement après les charges fixes.',
          risk: safeNumber(priorityDebt.monthly) <= 0 ? 'haut' : 'moyen'
        })
      }
    }

    if (/(objectif|alimenter|financer|épargner|epargner|augmenter mon épargne|augmenter mon epargne|atteindre)/.test(q)) {
      const endingBalance = context.projectedBalance
      const goal = context.primaryGoal || context.goals?.find((item) => item?.isPrimary) || context.goals?.[0]
      const recommended = Math.max(0, Math.min(Math.round(endingBalance * 0.4), 100))
      const verdict = endingBalance > 100 ? 'ok' : 'no'
      return {
        intent: 'goal',
        ...buildDecision({
          verdict,
          today: verdict === 'ok' ? `Oui, tu peux alimenter ${goal?.name || 'ton objectif'} prudemment.` : 'Pas maintenant.',
          why: `Marge prévisionnelle : ${formatEuro(endingBalance)}.`,
          impact: verdict === 'ok' ? `Versement conseillé : ${formatEuro(recommended)}.` : 'Un versement réduirait trop ta sécurité.',
          alternative: verdict === 'ok' ? `Commence par ${formatEuro(Math.max(20, Math.round(recommended / 2)))} si tu veux rester très prudent.` : 'Attends le prochain revenu ou baisse une dépense variable.',
          action: goal ? `Ajouter un versement à ${goal.name || 'l’objectif principal'}.` : 'Crée d’abord un objectif principal.',
          risk: endingBalance <= 0 ? 'haut' : endingBalance < 150 ? 'moyen' : 'faible'
        })
      }
    }

    if (/(priorité|priorite|payer en priorité|payer en priorite|quoi payer)/.test(q)) {
      const coach = await getProactiveCoach(context)
      return {
        intent: 'priority',
        ...buildDecision({
          verdict: 'recommend',
          today: coach.priority,
          why: coach.risks[0] || 'Aucun risque majeur détecté.',
          impact: `Solde fin de cycle : ${formatEuro(coach.summary.projectedBalance)}.`,
          alternative: coach.opportunities[0] || 'Garde une marge de sécurité avant toute dépense.',
          action: coach.dailyAdvice,
          risk: coach.risks.length ? 'moyen' : 'faible'
        })
      }
    }

    return {
      intent: 'unknown',
      ...buildDecision({
        verdict: 'unknown',
        today: 'Je peux t’aider, mais reformule avec un montant ou une priorité.',
        why: 'La question ne correspond pas encore à un arbitrage financier clair.',
        impact: 'Impact non calculable.',
        alternative: "Essaye : 'Puis-je acheter un PC à 600 € ?'",
        action: 'Ajoute un montant, une dette ou un objectif à analyser.',
        risk: 'modéré'
      })
    }
  }
}

export default AdvisorService
