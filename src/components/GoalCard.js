export default function createGoalCard(goal, handlers = {}) {
  const { onEdit, onDelete } = handlers
  const card = document.createElement('div')
  card.className = 'goal-card'
  card.style.borderLeft = `6px solid ${goal.color || '#e5c060'}`

  const title = document.createElement('div')
  title.className = 'goal-card-title'
  title.textContent = `${goal.icon || '🎯'} ${goal.name || 'Objectif'}`

  const meta = document.createElement('div')
  meta.className = 'goal-card-meta'
  const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0
  meta.innerHTML = `<div class="goal-pct">${pct}%</div><div class="goal-amount">${(Number(goal.current)||0).toLocaleString()} € / ${(Number(goal.target)||0).toLocaleString()} €</div>`

  const barWrap = document.createElement('div')
  barWrap.className = 'goal-progress-wrap'
  const fill = document.createElement('div')
  fill.className = 'goal-progress-fill'
  fill.style.width = Math.min(100, Math.max(0, pct)) + '%'
  barWrap.appendChild(fill)

  const footer = document.createElement('div')
  footer.className = 'goal-card-footer'
  const remaining = Math.max(0, (Number(goal.target)||0) - (Number(goal.current)||0))
  const est = goal.__estimatedMonths ? `${goal.__estimatedMonths} mois` : '—'
  footer.innerHTML = `<div class="goal-remaining">Reste: ${remaining.toLocaleString()} €</div><div class="goal-est">Est: ${est}</div>`

  const actions = document.createElement('div')
  actions.className = 'goal-actions'
  const editBtn = document.createElement('button')
  editBtn.className = 'btn'
  editBtn.textContent = 'Éditer'
  editBtn.onclick = () => onEdit && onEdit(goal)
  const delBtn = document.createElement('button')
  delBtn.className = 'btn btn-outline'
  delBtn.textContent = 'Supprimer'
  delBtn.onclick = () => onDelete && onDelete(goal)
  actions.appendChild(editBtn)
  actions.appendChild(delBtn)

  card.appendChild(title)
  card.appendChild(meta)
  card.appendChild(barWrap)
  card.appendChild(footer)
  card.appendChild(actions)

  return card
}
