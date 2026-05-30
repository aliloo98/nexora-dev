import { analyzeBudget } from '../assistant/assistantEngine.js'

function createAssistantCard() {
  const container = document.createElement('section')
  container.className = 'analytics-card assistant-card'
  container.id = 'assistant-card'
  container.innerHTML = `
    <div class="assistant-header">
      <div>
        <div class="assistant-eyebrow">Assistant Nexora</div>
        <h3 class="assistant-title">Lecture financière intelligente</h3>
      </div>
      <div class="assistant-badge">✨ Premium</div>
    </div>
    <div class="assistant-body">
      <div class="assistant-top">
        <div class="assistant-score">
          <div class="score-ring"><span id="assistant-score-val">0</span></div>
          <div class="score-meta">
            <span id="assistant-score-label" class="score-label">Aucune donnée</span>
            <span id="assistant-score-status" class="score-status">Statut disponible après saisie</span>
          </div>
        </div>
        <div id="assistant-status" class="assistant-status neutral">—</div>
      </div>
      <div class="assistant-highlight">
        <strong id="assistant-highlight-title">Insight principal</strong>
        <p id="assistant-highlight-text">Les informations clés apparaîtront ici dès que vous aurez saisi vos revenus et dépenses.</p>
      </div>
      <div class="assistant-content">
        <div class="assistant-block assistant-insights">
          <strong>Insights</strong>
          <ul id="assistant-insights-list"></ul>
        </div>
        <div class="assistant-block assistant-recs">
          <strong>Recommandations</strong>
          <ul id="assistant-recs-list"></ul>
        </div>
      </div>
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    .assistant-card{padding:24px;display:flex;flex-direction:column;gap:18px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(229,192,96,0.18);box-shadow:0 20px 60px rgba(0,0,0,0.26)}
    .assistant-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .assistant-eyebrow{text-transform:uppercase;color:var(--gold);letter-spacing:1px;font-size:11px;font-weight:800}
    .assistant-title{font-size:20px;line-height:1.2;color:var(--text);margin-top:8px}
    .assistant-badge{padding:6px 12px;background:rgba(229,192,96,0.12);color:var(--gold);border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.5px}
    .assistant-body{display:flex;flex-direction:column;gap:18px}
    .assistant-top{display:flex;justify-content:space-between;align-items:center;gap:16px}
    .assistant-score{display:flex;align-items:center;gap:16px}
    .score-ring{width:86px;height:86px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top left,rgba(229,192,96,0.24),transparent 58%);border:2px solid rgba(229,192,96,0.25);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)}
    #assistant-score-val{font-size:28px;font-weight:900;letter-spacing:-0.02em;color:var(--text)}
    .score-meta{display:flex;flex-direction:column;gap:6px}
    .score-label{font-size:12px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:0.6px}
    .score-status{font-size:14px;color:var(--text);max-width:220px;line-height:1.4}
    .assistant-status{font-weight:700;padding:8px 14px;border-radius:999px;white-space:nowrap}
    .assistant-status.healthy{background:rgba(16,185,129,0.12);color:var(--green);border:1px solid rgba(16,185,129,0.18)}
    .assistant-status.neutral{background:rgba(255,255,255,0.05);color:var(--text2);border:1px solid rgba(255,255,255,0.08)}
    .assistant-status.critical{background:rgba(244,63,94,0.12);color:var(--red);border:1px solid rgba(244,63,94,0.18)}
    .assistant-highlight{background:rgba(229,192,96,0.07);border:1px solid rgba(229,192,96,0.18);border-radius:18px;padding:16px}
    .assistant-highlight strong{display:block;font-size:13px;color:var(--gold);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px}
    .assistant-highlight p{font-size:15px;line-height:1.6;color:var(--text);margin:0}
    .assistant-content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
    .assistant-block{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:18px;padding:16px}
    .assistant-block strong{display:block;font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:var(--gold);margin-bottom:10px}
    .assistant-insights ul,.assistant-recs ul{margin:0;padding-left:18px;list-style:disc;max-height:120px;overflow:hidden}
    .assistant-insights li,.assistant-recs li{font-size:13px;line-height:1.6;color:var(--text2);margin-bottom:10px}
    .assistant-insights li:last-child,.assistant-recs li:last-child{margin-bottom:0}
    @media(max-width:860px){.assistant-content{grid-template-columns:1fr}.assistant-top{flex-direction:column;align-items:flex-start}.assistant-score{flex-direction:row;gap:12px}.score-status{max-width:100%}}
    @media(max-width:640px){.assistant-card{padding:18px}.score-ring{width:68px;height:68px}#assistant-score-val{font-size:24px}.assistant-header{flex-direction:column;align-items:flex-start}.assistant-badge{width:100%;text-align:center}.assistant-highlight{padding:14px}.assistant-block{padding:14px}}
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

  const scoreEl = existing.querySelector('#assistant-score-val')
  const labelEl = existing.querySelector('#assistant-score-label')
  const metaEl = existing.querySelector('#assistant-score-status')
  const statusEl = existing.querySelector('#assistant-status')
  const highlightTitleEl = existing.querySelector('#assistant-highlight-title')
  const highlightTextEl = existing.querySelector('#assistant-highlight-text')
  const insightsList = existing.querySelector('#assistant-insights-list')
  const recsList = existing.querySelector('#assistant-recs-list')

  if (scoreEl) scoreEl.textContent = result.score || 0
  if (labelEl) labelEl.textContent = result.scoreLabel || ''
  if (metaEl) metaEl.textContent = result.status ? `État : ${result.status}` : 'Mise à jour en cours'
  if (statusEl) {
    statusEl.textContent = (result.status || '').toUpperCase()
    statusEl.className = 'assistant-status ' + (result.status || 'neutral')
  }
  if (highlightTitleEl) highlightTitleEl.textContent = 'Insight principal'
  if (highlightTextEl) highlightTextEl.textContent = result.insights && result.insights.length > 0 ? result.insights[0] : 'Les informations clés apparaîtront ici dès que vous aurez saisi vos revenus et dépenses.'

  const renderItems = (el, items, limit = 3) => {
    if (!el) return
    el.innerHTML = ''
    (items || []).slice(0, limit).forEach(i => {
      const li = document.createElement('li')
      li.textContent = i
      el.appendChild(li)
    })
  }

  renderItems(insightsList, result.insights, 3)
  renderItems(recsList, result.recommendations, 3)

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
