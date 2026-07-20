export function toggleAvailableMoneyOptions(button = null, actions = null) {
  const trigger = button || document.getElementById('available-money-options-toggle')
  const panel = actions || document.getElementById('available-money-actions')

  if (!trigger || !panel) return false

  const nextExpanded = trigger.getAttribute('aria-expanded') !== 'true'
  trigger.setAttribute('aria-expanded', String(nextExpanded))

  const label = nextExpanded ? 'Masquer les options' : 'Voir les options'
  trigger.textContent = label

  panel.hidden = !nextExpanded

  if (panel.classList && typeof panel.classList.toggle === 'function') {
    panel.classList.toggle('is-visible', nextExpanded)
  } else if (panel.classList) {
    if (nextExpanded) panel.classList.add('is-visible')
    else panel.classList.remove('is-visible')
  }

  return nextExpanded
}

if (typeof window !== 'undefined') {
  window.toggleAvailableMoneyOptions = toggleAvailableMoneyOptions
}

export default toggleAvailableMoneyOptions
