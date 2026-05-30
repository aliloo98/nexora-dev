import { analyzeBudget } from '../assistant/assistantEngine.js'

function createAssistantCard() {
  const container = document.createElement('section')
  container.className = 'analytics-card assistant-card'
  container.id = 'assistant-card'
  container.innerHTML = `
    <div class="assistant-header">
      <div>
        <div class="assistant-eyebrow">Assistant Nexora</div>
        <h3 class="assistant-title">Assistant financier IA</h3>
      </div>
      <div class="assistant-labels">
        <div class="assistant-badge">Assistant IA</div>
        <div id="assistant-trajectory" class="assistant-trajectory">Bonne trajectoire</div>
      </div>
    </div>
    <div class="assistant-body">
      <div class="assistant-situation assistant-block">
        <strong>Situation actuelle</strong>
        <p id="assistant-situation-text">Les tendances financières seront affichées ici dès que vous aurez saisi vos revenus et dépenses.</p>
      </div>
      <div class="assistant-main-grid">
        <div class="assistant-analysis assistant-block">
          <strong>Analyse du mois</strong>
          <p id="assistant-analysis-text">Les informations clés apparaîtront ici dès que vous aurez saisi vos revenus et dépenses.</p>
        </div>
        <div class="assistant-block assistant-vigilance">
          <strong>Point de vigilance</strong>
          <ul id="assistant-vigilance-list"></ul>
        </div>
        <div class="assistant-block assistant-action">
          <strong>Action recommandée</strong>
          <ul id="assistant-action-list"></ul>
        </div>
      </div>
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    .assistant-card{padding:16px;display:grid;grid-template-columns:1fr;gap:12px;border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(229,192,96,0.18);box-shadow:0 18px 40px rgba(0,0,0,0.18)}
    .assistant-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .assistant-labels{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
    .assistant-eyebrow{text-transform:uppercase;color:var(--gold);letter-spacing:1px;font-size:10px;font-weight:800}
    .assistant-title{font-size:18px;line-height:1.2;color:var(--text);margin-top:6px}
    .assistant-badge{padding:6px 10px;background:rgba(229,192,96,0.12);color:var(--gold);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.5px}
    .assistant-trajectory{padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;min-width:fit-content}
    .assistant-trajectory.healthy{background:rgba(34,197,94,0.12);color:var(--green);border:1px solid rgba(34,197,94,0.18)}
    .assistant-trajectory.neutral{background:rgba(250,204,21,0.12);color:var(--yellow);border:1px solid rgba(250,204,21,0.18)}
    .assistant-trajectory.critical{background:rgba(244,63,94,0.12);color:var(--red);border:1px solid rgba(244,63,94,0.18)}
    .assistant-body{display:grid;grid-template-columns:1fr;gap:12px}
    .assistant-main-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .assistant-situation, .assistant-analysis, .assistant-block{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:14px;min-height:88px}
    .assistant-analysis p,.assistant-situation p{font-size:14px;line-height:1.5;color:var(--text);margin:0}
    .assistant-block strong, .assistant-analysis strong, .assistant-situation strong{display:block;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
    .assistant-vigilance ul,.assistant-action ul{margin:0;padding-left:18px;list-style:disc;max-height:110px;overflow:hidden}
    .assistant-vigilance li,.assistant-action li{font-size:13px;line-height:1.5;color:var(--text2);margin-bottom:8px}
    @media(max-width:960px){.assistant-main-grid{grid-template-columns:1fr}}
    @media(max-width:640px){.assistant-card{padding:14px}.assistant-block{padding:12px}.assistant-analysis,.assistant-situation{padding:12px}}
  `
  container.appendChild(style)

  return container
}

async function renderAssistantCard() {
  const grid = document.querySelector('.analytics-grid') || document.querySelector('.kpi-grid') || document.body
  if (!grid) return

  let existing = document.getElementById('assistant-card')
  if (!existing) {
    const el = createAssistantCard()
    const first = grid.querySelector('section')
    if (first) grid.insertBefore(el, first)
    else grid.appendChild(el)
    existing = document.getElementById('assistant-card')
  }

  const result = await analyzeBudget()
  const situationEl = existing.querySelector('#assistant-situation-text')
  const analysisEl = existing.querySelector('#assistant-analysis-text')
  const trajectoryEl = existing.querySelector('#assistant-trajectory')
  const vigilanceList = existing.querySelector('#assistant-vigilance-list')
  const actionList = existing.querySelector('#assistant-action-list')

  if (trajectoryEl) {
    trajectoryEl.textContent = result.trajectoryLabel || 'Analyse en cours'
    trajectoryEl.className = `assistant-trajectory ${result.status || 'neutral'}`
  }
  if (situationEl) situationEl.textContent = result.currentSituation || 'Les tendances financières seront affichées ici.'
  if (analysisEl) analysisEl.textContent = result.naturalAnalysis || (result.insights && result.insights.length > 0 ? result.insights[0] : 'Analyse indisponible pour le mois.')

  const renderItems = (el, items, limit = 3) => {
    if (!el) return
    el.innerHTML = ''
    // Defensive: coerce non-array/list inputs to an array so .slice/.forEach are safe
    let listItems = items
    if (!Array.isArray(listItems)) {
      try {
        if (listItems && typeof listItems === 'object' && typeof listItems.length === 'number') {
          listItems = Array.from(listItems)
        } else if (listItems == null) {
          listItems = []
        } else {
          listItems = [String(listItems)]
        }
      } catch (e) {
        listItems = []
      }
    }

    listItems.slice(0, limit).forEach(i => {
      const li = document.createElement('li')
      li.textContent = i
      el.appendChild(li)
    })
  }

  // Vigilance -> show natural alert phrases, fallback to raw alerts if needed
  renderItems(vigilanceList, result.alertDisplay || result.alerts, 3)
  // Action -> show recommendations
  renderItems(actionList, result.recommendations, 3)

  return result
}

// Guard to avoid overlapping renders
let _assistantIsRendering = false
let _assistantScheduledTimeout = null

async function _renderGuarded() {
  if (_assistantIsRendering) return
  _assistantIsRendering = true
  try {
    await renderAssistantCard()
  } finally {
    _assistantIsRendering = false
  }
}

function scheduleAssistantRefresh(delay = 300) {
  if (_assistantScheduledTimeout) clearTimeout(_assistantScheduledTimeout)
  _assistantScheduledTimeout = setTimeout(() => {
    _assistantScheduledTimeout = null
    _renderGuarded().catch(err => console.warn('[Assistant] scheduled render failed', err))
  }, delay)
}

// Immediate manual refresh
window.renderAssistantCard = () => _renderGuarded()
// Debounced scheduler
window.scheduleAssistantRefresh = scheduleAssistantRefresh

export { renderAssistantCard, scheduleAssistantRefresh }
