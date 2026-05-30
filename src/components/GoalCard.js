export default function createGoalCard(goal, handlers = {}) {
  const { onEdit, onDelete, onSetPrimary } = handlers
  const card = document.createElement('div')
  card.className = `goal-card${goal.isPrimary ? ' is-primary-goal' : ''}`
  card.style.borderLeft = `6px solid ${goal.color || '#e5c060'}`

  const title = document.createElement('div')
  title.className = 'goal-card-title'
  title.textContent = `${goal.icon || '🎯'} ${goal.name || 'Objectif'}`

  const meta = document.createElement('div')
  meta.className = 'goal-card-meta'
  const current = Number(goal.current) || 0
  const target = Number(goal.target) || 0
  const pct = target > 0 ? Math.round((current / target) * 100) : 0
  const safePct = Math.min(100, Math.max(0, pct))
  const status = safePct >= 100
    ? 'Objectif atteint'
    : safePct >= 75
      ? 'Dernière ligne droite'
      : safePct >= 40
        ? 'Bonne progression'
        : 'À lancer'
  meta.innerHTML = `
    <div>
      <span class="goal-status">${status}</span>
      <div class="goal-amount">${current.toLocaleString()} € / ${target.toLocaleString()} €</div>
    </div>
    <div class="goal-pct">${safePct}%</div>
  `

  const barWrap = document.createElement('div')
  barWrap.className = 'goal-progress-wrap'
  const fill = document.createElement('div')
  fill.className = 'goal-progress-fill'
  fill.style.width = safePct + '%'
  fill.style.background = goal.color || '#e5c060'
  barWrap.appendChild(fill)

  const footer = document.createElement('div')
  footer.className = 'goal-card-footer'
  const remaining = Math.max(0, target - current)
  const est = goal.__estimatedMonths ? `${goal.__estimatedMonths} mois` : '—'
  const targetDate = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Non définie'
  footer.innerHTML = `
    <div class="goal-remaining"><span>Reste</span><strong>${remaining.toLocaleString()} €</strong></div>
    <div class="goal-date"><span>Échéance</span><strong>${targetDate}</strong></div>
    <div class="goal-est"><span>Rythme</span><strong>${est}</strong></div>
  `

  const actions = document.createElement('div')
  actions.className = 'goal-actions'
  const editBtn = document.createElement('button')
  editBtn.className = 'btn'
  editBtn.textContent = 'Éditer'
  editBtn.onclick = () => onEdit && onEdit(goal)
  const primaryBtn = document.createElement('button')
  primaryBtn.className = goal.isPrimary ? 'btn btn-gold' : 'btn btn-outline'
  primaryBtn.textContent = goal.isPrimary ? 'Objectif principal' : 'Définir principal'
  primaryBtn.disabled = goal.isPrimary === true
  primaryBtn.onclick = () => onSetPrimary && onSetPrimary(goal)
  const delBtn = document.createElement('button')
  delBtn.className = 'btn btn-outline'
  delBtn.textContent = 'Supprimer'
  delBtn.onclick = () => onDelete && onDelete(goal)
  actions.appendChild(editBtn)
  actions.appendChild(primaryBtn)
  actions.appendChild(delBtn)

  card.appendChild(title)
  card.appendChild(meta)
  card.appendChild(barWrap)
  card.appendChild(footer)
  card.appendChild(actions)

  return card
}
