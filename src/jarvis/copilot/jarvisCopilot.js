import { createJarvisCopilotEngine, getJarvisQuickPrompts } from './jarvisCopilotEngine.js'
import { INTENTS } from './jarvisIntentParser.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatFinancialValue(fact) {
  if (!fact || fact.value === null || fact.value === undefined || fact.value === '') return 'Indisponible'
  if (fact.unit === 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: Number.isInteger(Number(fact.value)) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(Number(fact.value))
  }
  if (fact.unit === 'PERCENT') {
    return `${Math.round(Number(fact.value))}%`
  }
  return String(fact.value)
}

function formatCurrency(value) {
  return formatFinancialValue({ value, unit: 'EUR' })
}

function renderQuickPrompts(snapshot) {
  return getJarvisQuickPrompts(snapshot).map((prompt, index) => `
    <button
      type="button"
      class="jarvis-copilot-prompt"
      data-jarvis-prompt-index="${index}"
    >${escapeHtml(prompt.label)}</button>
  `).join('')
}

function renderContextRail(snapshot) {
  const health = snapshot?.health?.label || snapshot?.health?.status || 'Analyse'
  const margin = snapshot?.cashflow?.projected ?? 0
  const forecast = snapshot?.forecast?.finalBalance ?? margin
  const priority = Array.isArray(snapshot?.priorities) && snapshot.priorities[0]
    ? snapshot.priorities[0].action
    : 'Aucune priorité critique'

  return `
    <div class="jarvis-copilot-context" aria-label="Contexte financier Jarvis">
      <div class="jarvis-copilot-context-item">
        <span>Santé</span>
        <strong>${escapeHtml(health)}</strong>
      </div>
      <div class="jarvis-copilot-context-item">
        <span>Marge</span>
        <strong>${escapeHtml(formatCurrency(margin))}</strong>
      </div>
      <div class="jarvis-copilot-context-item">
        <span>Fin de mois</span>
        <strong>${escapeHtml(formatCurrency(forecast))}</strong>
      </div>
      <div class="jarvis-copilot-context-item jarvis-copilot-context-item--wide">
        <span>Priorité</span>
        <strong>${escapeHtml(priority)}</strong>
      </div>
    </div>
  `
}

export function renderJarvisCopilot(snapshot = {}) {
  const quickPrompts = renderQuickPrompts(snapshot)
  const contextRail = renderContextRail(snapshot)

  return `
    <section class="jarvis-copilot" data-jarvis-copilot-state="closed" aria-label="Copilote financier Jarvis">
      <div class="jarvis-copilot-command">
        <button
          type="button"
          class="jarvis-copilot-identity"
          data-jarvis-copilot-open
          aria-expanded="false"
          aria-controls="jarvis-copilot-panel"
        >
          <span class="jarvis-copilot-signal" aria-hidden="true"></span>
          <span>
            <span class="jarvis-copilot-kicker">JARVIS</span>
            <span class="jarvis-copilot-role">Copilote financier</span>
          </span>
        </button>
        <div class="jarvis-copilot-status">
          <span>Analyse actualisée</span>
          <strong>Mode complet</strong>
        </div>
        <form class="jarvis-copilot-form" data-jarvis-copilot-form>
          <label class="nx-sr-only" for="jarvis-copilot-input">Demander à Jarvis</label>
          <textarea
            id="jarvis-copilot-input"
            class="jarvis-copilot-input"
            data-jarvis-copilot-input
            rows="1"
            placeholder="Demande à Jarvis…"
          ></textarea>
          <button type="submit" class="jarvis-copilot-send" aria-label="Envoyer">➜</button>
        </form>
      </div>
      <div class="jarvis-copilot-prompts" aria-label="Questions rapides Jarvis">
        ${quickPrompts}
      </div>
      <div id="jarvis-copilot-panel" class="jarvis-copilot-panel" hidden>
        <div class="jarvis-copilot-panel-header">
          <div>
            <span class="jarvis-copilot-kicker">Brief financier</span>
            <h3>Réponse Jarvis</h3>
          </div>
          <button type="button" class="jarvis-copilot-close" data-jarvis-copilot-close>Fermer</button>
        </div>
        ${contextRail}
        <div class="jarvis-copilot-thread" data-jarvis-copilot-thread aria-live="polite">
          <div class="jarvis-copilot-empty-state" data-jarvis-empty-state>
            <p>Jarvis est prêt. Posez une question sur votre situation financière.</p>
          </div>
        </div>
      </div>
    </section>
  `
}

function setOpenState(root, open) {
  const panel = root.querySelector('#jarvis-copilot-panel')
  const trigger = root.querySelector('[data-jarvis-copilot-open]')
  root.dataset.jarvisCopilotState = open ? 'open' : 'closed'
  if (panel) panel.hidden = !open
  if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false')
}

function autoGrow(textarea) {
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`
}

function appendUserMessage(thread, text) {
  const item = thread.ownerDocument.createElement('article')
  item.className = 'jarvis-copilot-user-message'
  item.textContent = text
  thread.appendChild(item)
  const emptyState = thread.querySelector('[data-jarvis-empty-state]')
  if (emptyState) emptyState.remove()
  scrollThreadToEnd(thread)
}

function scrollThreadToEnd(thread) {
  if (!thread) return
  thread.scrollTop = thread.scrollHeight
}

function renderFactList(facts = []) {
  const visibleFacts = facts.filter(fact => fact && fact.value !== null && fact.value !== undefined).slice(0, 5)
  if (visibleFacts.length === 0) return ''

  return `
    <dl class="jarvis-copilot-facts">
      ${visibleFacts.map(fact => `
        <div class="jarvis-copilot-fact">
          <dt>${escapeHtml(fact.label)}</dt>
          <dd>${escapeHtml(formatFinancialValue(fact))}</dd>
        </div>
      `).join('')}
    </dl>
  `
}

function renderScenario(response) {
  const scenario = response.scenario
  if (!scenario?.ok) return ''

  return `
    <div class="jarvis-copilot-scenario" data-scenario-type="${escapeHtml(scenario.type)}">
      <div class="jarvis-copilot-scenario-label">Simulation — aucune donnée modifiée</div>
      <div class="jarvis-copilot-scenario-grid">
        <div>
          <span>Avant</span>
          <strong>${escapeHtml(formatCurrency(scenario.before.margin))}</strong>
          <small>Marge projetée</small>
        </div>
        <div>
          <span>Après</span>
          <strong>${escapeHtml(formatCurrency(scenario.after.margin))}</strong>
          <small>Marge projetée</small>
        </div>
        <div>
          <span>Différence</span>
          <strong>${escapeHtml(formatCurrency(scenario.diff.margin))}</strong>
          <small>Impact</small>
        </div>
      </div>
    </div>
  `
}

function renderActions(response) {
  const actions = Array.isArray(response.actions) ? response.actions.slice(0, 3) : []
  if (actions.length === 0) return ''

  return `
    <div class="jarvis-copilot-actions">
      ${actions.map((action, index) => `
        <button
          type="button"
          class="jarvis-copilot-action"
          data-jarvis-action-index="${index}"
        >${escapeHtml(action.label)}</button>
      `).join('')}
    </div>
  `
}

function appendJarvisResponse(thread, response) {
  const item = thread.ownerDocument.createElement('article')
  item.className = 'jarvis-copilot-response'
  item.dataset.intent = response.intent
  item.dataset.tone = response.tone || 'neutral'
  item.innerHTML = `
    <div class="jarvis-copilot-response-head">
      <span>${escapeHtml(response.verdict)}</span>
      <strong>${escapeHtml(response.title)}</strong>
    </div>
    <p>${escapeHtml(response.summary)}</p>
    ${renderScenario(response)}
    ${renderFactList(response.evidence)}
    ${renderActions(response)}
  `
  thread.appendChild(item)
  const emptyState = thread.querySelector('[data-jarvis-empty-state]')
  if (emptyState) emptyState.remove()
  scrollThreadToEnd(thread)
  return item
}

function createSnapshotProvider(options = {}) {
  if (typeof options.getSnapshot === 'function') return options.getSnapshot
  return async () => options.initialSnapshot || {}
}

export function attachJarvisCopilot(container, options = {}) {
  const root = container?.querySelector?.('.jarvis-copilot')
  if (!root || root.dataset.jarvisCopilotBound === 'true') return null

  root.dataset.jarvisCopilotBound = 'true'

  const documentRef = options.documentRef || container.ownerDocument || document
  const windowRef = options.windowRef || documentRef.defaultView || window
  const engine = createJarvisCopilotEngine()
  const getSnapshot = createSnapshotProvider(options)
  const prompts = getJarvisQuickPrompts(options.initialSnapshot || {})
  const thread = root.querySelector('[data-jarvis-copilot-thread]')
  const input = root.querySelector('[data-jarvis-copilot-input]')
  const form = root.querySelector('[data-jarvis-copilot-form]')
  const openButton = root.querySelector('[data-jarvis-copilot-open]')
  const closeButton = root.querySelector('[data-jarvis-copilot-close]')
  const submitButton = root.querySelector('.jarvis-copilot-send')
  let lastTrigger = openButton

  const openPanel = (shouldFocus = false, trigger = null) => {
    if (trigger) {
      lastTrigger = trigger
    } else if (!root.contains(documentRef.activeElement)) {
      lastTrigger = documentRef.activeElement || openButton
    }
    setOpenState(root, true)
    if (shouldFocus) input?.focus()
  }

  const closePanel = () => {
    setOpenState(root, false)
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus()
  }

  const renderResponse = async (inputValue) => {
    if (!thread || !inputValue) return
    const snapshot = await getSnapshot()
    const { response } = engine.ask(snapshot, inputValue)
    appendJarvisResponse(thread, response)
    const responseNode = thread.lastElementChild
    scrollThreadToEnd(thread)

    responseNode?.querySelectorAll('[data-jarvis-action-index]').forEach((button) => {
      const action = response.actions?.[Number(button.dataset.jarvisActionIndex)]
      button.addEventListener('click', () => {
        if (action?.target && typeof windowRef.showSection === 'function') {
          windowRef.showSection(action.target)
          return
        }
        if (action?.intent) {
          renderPromptAction(action)
        }
      })
    })
  }

  const submitText = async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return
    openPanel(false)
    appendUserMessage(thread, trimmed)
    if (submitButton) submitButton.disabled = true
    if (input) input.disabled = true
    try {
      await renderResponse(trimmed)
    } catch (error) {
      const fallback = thread.ownerDocument.createElement('article')
      fallback.className = 'jarvis-copilot-response'
      fallback.dataset.tone = 'warning'
      fallback.innerHTML = `
        <div class="jarvis-copilot-response-head">
          <span>Analyse indisponible</span>
          <strong>Je n’ai pas pu actualiser l’analyse.</strong>
        </div>
        <p>Tes données n’ont pas été modifiées.</p>
      `
      thread.appendChild(fallback)
      const emptyState = thread.querySelector('[data-jarvis-empty-state]')
      if (emptyState) emptyState.remove()
      if (windowRef.location?.hostname === 'localhost') {
        console.warn('[Jarvis Copilot] response failed:', error)
      }
    } finally {
      if (input) {
        input.disabled = false
        input.value = ''
        autoGrow(input)
      }
      if (submitButton) submitButton.disabled = false
    }
  }

  const renderPromptAction = async (prompt) => {
    openPanel(false)
    const label = prompt.prompt || prompt.label || 'Question Jarvis'
    appendUserMessage(thread, label)
    const snapshot = await getSnapshot()
    const { response } = engine.ask(snapshot, prompt)
    appendJarvisResponse(thread, response)
    scrollThreadToEnd(thread)
  }

  openButton?.addEventListener('click', () => openPanel(true, openButton))
  closeButton?.addEventListener('click', closePanel)
  input?.addEventListener('focus', () => setOpenState(root, true))
  input?.addEventListener('input', () => autoGrow(input))
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      form?.requestSubmit()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closePanel()
    }
  })
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel()
  })
  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    submitText(input?.value)
  })

  root.querySelectorAll('[data-jarvis-prompt-index]').forEach((button) => {
    const prompt = prompts[Number(button.dataset.jarvisPromptIndex)]
    button.addEventListener('click', () => renderPromptAction(prompt))
  })

  return {
    open: () => openPanel(true, openButton),
    close: closePanel,
    ask: submitText,
    askIntent: (intent) => renderPromptAction({ intent, label: intent }),
    getState: () => engine.getState()
  }
}

export { INTENTS }
