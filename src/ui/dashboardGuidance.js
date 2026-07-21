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

  let situationTitle = 'Diagnostic en cours'
  let situationText = 'Saisis les revenus et dépenses du mois pour obtenir un jugement fiable.'
  if (revReel > 0 && solde >= 0) {
    situationTitle = `Solde du mois positif : ${fmt(solde)}`
    situationText = `Après les dépenses prévues, le mois garde ${tauxEp}% d'épargne.`
  } else if (revReel > 0) {
    situationTitle = `Décalage à corriger : ${fmt(Math.abs(solde))}`
    situationText = 'Les dépenses prévues dépassent les revenus du mois.'
  }

  let watchTitle = 'Rien d’urgent'
  let watchText = `${fmt(totalDepRestant)} restent à payer.`
  if (revReel === 0) {
    watchTitle = 'Données incomplètes'
    watchText = 'Commence par renseigner les revenus pour obtenir un diagnostic.'
  } else if (soldeEstime < 0) {
    watchTitle = 'Marge insuffisante'
    watchText = 'Les paiements déjà saisis grignotent la trésorerie disponible.'
  } else if (fixesPct >= 55) {
    watchTitle = 'Charges fixes lourdes'
    watchText = `Les charges fixes représentent ${fixesPct}% des revenus.`
  } else if (variablesPct > 40) {
    watchTitle = 'Dépenses variables à surveiller'
    watchText = `Les dépenses variables atteignent ${variablesPct}% des revenus.`
  } else if (tauxCh > 85) {
    watchTitle = 'Taux de charges élevé'
    watchText = `Les charges consomment ${tauxCh}% des revenus.`
  }

  let actionTitle = 'Valider le mois'
  let actionText = 'Vérifie les montants puis valide le mois pour garder une lecture claire.'
  if (revReel === 0) {
    actionTitle = 'Saisir les revenus'
    actionText = 'Commence par renseigner les revenus pour débloquer le diagnostic.'
  } else if (depPayesPct < 50 && totalDepRestant > 0) {
    actionTitle = 'Mettre à jour les paiements'
    actionText = `Renseigne les paiements déjà effectués pour suivre précisément les ${fmt(totalDepRestant)} restants.`
  } else if (tauxEp < 10) {
    actionTitle = 'Réduire une dépense'
    actionText = 'Cherche une dépense variable ou un abonnement à réduire pour retrouver de la marge.'
  } else if (solde > 0) {
    actionTitle = 'Protéger l’épargne'
    actionText = 'Mets de côté une partie du solde pour sécuriser le mois à venir.'
  }

  return { situationTitle, situationText, watchTitle, watchText, actionTitle, actionText }
}

export default buildDashboardGuidance
