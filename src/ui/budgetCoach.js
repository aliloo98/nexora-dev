export function buildBudgetCoachState(values = {}) {
    const parseAmount = (value) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount : 0
  }

  const income = ['rev_ali', 'rev_megane', 'rev_excep'].reduce((sum, key) => sum + parseAmount(values[key]), 0)
  const fixed = ['loyer', 'credit', 'assauto', 'gasoil', 'elec', 'eau', 'psy', 'diete', 'itou', 'sante', 'impots', 'box', 'tel_ali', 'tel_meg', 'stream', 'ps', 'cb', 'impfix'].reduce((sum, key) => sum + parseAmount(values[key]), 0)
  const variable = ['courses', 'tabac', 'sport', 'ongles', 'cadeaux', 'impvar'].reduce((sum, key) => sum + parseAmount(values[key]), 0)
  const balance = income - (fixed + variable)

  if (income <= 0) {
    return {
      key: 'income',
      tone: 'info',
      kicker: 'Prochaine étape',
      title: 'Commence par saisir un revenu',
      reason: 'Aucun revenu ne permet encore de lire ce mois.',
      actionLabel: 'Ajouter un revenu',
      target: 'revenues'
    }
  }

  if (fixed <= 0) {
    return {
      key: 'fixed',
      tone: 'info',
      kicker: 'Prochaine étape',
      title: 'Ajoute tes charges fixes',
      reason: 'Les charges fixes sont nécessaires pour lire le mois.',
      actionLabel: 'Saisir les charges',
      target: 'fixed-expenses'
    }
  }

  if (variable <= 0) {
    return {
      key: 'variable',
      tone: 'info',
      kicker: 'Prochaine étape',
      title: 'Ajoute une dépense variable',
      reason: 'Ajoute une première dépense pour rendre le mois concret.',
      actionLabel: 'Ajouter une dépense',
      target: 'variable-expenses'
    }
  }

  if (balance < 0) {
    return {
      key: 'pressure',
      tone: 'warning',
      kicker: 'À surveiller',
      title: 'Réduis la pression du mois',
      reason: 'Les dépenses dépassent les revenus du mois.',
      actionLabel: 'Réviser le budget',
      target: 'budget'
    }
  }

  return {
    key: 'healthy',
    tone: 'success',
    kicker: 'Situation claire',
    title: 'Le budget tient bien',
    reason: 'Le mois garde une marge pour les imprévus.',
    actionLabel: 'Voir la synthèse',
    target: 'dashboard'
  }
}

export function renderBudgetCoach(root, values = {}) {
    if (!root) return null
  const state = buildBudgetCoachState(values)
    root.innerHTML = `
    <div class="budget-coach-card ${state.tone}">
      <div class="budget-coach-head">
        <div>
          <div class="budget-coach-kicker">${state.kicker}</div>
          <h3>${state.title}</h3>
        </div>
      </div>
      <p class="budget-coach-reason">${state.reason}</p>
      <button type="button" class="budget-coach-action" data-target="${state.target}">${state.actionLabel}</button>
    </div>
  `
    return state
}
