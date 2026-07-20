const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

export function buildDashboardGuidance(metrics = {}) {
  const {
    revReel = 0,
    totalDepRestant = 0,
    solde = 0,
    soldeEstime = 0,
    tauxEp = 0,
    tauxCh = 0,
    depPayesPct = 0,
    fixesPct = 0,
    variablesPct = 0
  } = metrics

  let situationTitle = 'Budget à compléter'
  let situationText = 'Ajoute les revenus et dépenses du mois pour obtenir une lecture fiable.'
  if (revReel > 0 && solde >= 0) {
    situationTitle = `Solde fin de cycle positif : ${fmt(solde)}`
    situationText = `Après toutes les dépenses prévues, le budget garde ${tauxEp}% d'épargne.`
  } else if (revReel > 0) {
    situationTitle = `Déficit prévu : ${fmt(Math.abs(solde))}`
    situationText = 'Le total des dépenses prévues dépasse les revenus du mois.'
  }

  let watchTitle = 'Rien de critique'
  let watchText = `${fmt(totalDepRestant)} restent à payer.`
  if (revReel === 0) {
    watchTitle = 'Données insuffisantes'
    watchText = 'Ajoutez vos revenus pour commencer.'
  } else if (soldeEstime < 0) {
    watchTitle = 'Solde actuel négatif'
    watchText = 'Les paiements déjà saisis dépassent les revenus disponibles.'
  } else if (fixesPct >= 55) {
    watchTitle = 'Charges fixes élevées'
    watchText = `Les charges fixes représentent ${fixesPct}% des revenus.`
  } else if (variablesPct > 40) {
    watchTitle = 'Variables à surveiller'
    watchText = `Les dépenses variables atteignent ${variablesPct}% des revenus.`
  } else if (tauxCh > 85) {
    watchTitle = 'Taux de charges élevé'
    watchText = `Les charges consomment ${tauxCh}% des revenus.`
  }

  let actionTitle = 'Sauvegarder le mois'
  let actionText = 'Une fois les montants vérifiés, utilise le bouton Sauvegarder.'
  if (revReel === 0) {
    actionTitle = 'Saisir les revenus'
    actionText = 'Commence par renseigner les revenus pour débloquer les indicateurs.'
  } else if (depPayesPct < 50 && totalDepRestant > 0) {
    actionTitle = 'Mettre à jour les paiements'
    actionText = `Complète les paiements déjà effectués pour suivre précisément les ${fmt(totalDepRestant)} restants.`
  } else if (tauxEp < 10) {
    actionTitle = 'Réduire une dépense'
    actionText = 'Cherche une variable ou un abonnement facile à réduire pour gagner en marge.'
  } else if (solde > 0) {
    actionTitle = 'Protéger l’épargne'
    actionText = 'Mets de côté une partie du solde pour sécuriser ton mois à venir.'
  }

  return { situationTitle, situationText, watchTitle, watchText, actionTitle, actionText }
}

export default buildDashboardGuidance
