import { analyzeBudget } from '../assistant/assistantEngine.js'

function createAssistantCard() {
  const container = document.createElement('section')
  container.className = 'analytics-card assistant-card'
  container.id = 'assistant-card'
  container.setAttribute('role', 'region')
  container.setAttribute('aria-label', 'Assistant financier Nexora')
  container.innerHTML = `
    <div class="assistant-header">
      <div>
        <div class="assistant-eyebrow">Assistant Nexora</div>
        <h3 class="assistant-title">Assistant financier IA</h3>
      </div>
      <div class="assistant-labels">
        <div class="assistant-badge">Assistant IA</div>
        <div id="assistant-trajectory" class="assistant-trajectory">Analyse en cours...</div>
      </div>
    </div>
    <div class="assistant-body">
      <div class="assistant-situation assistant-block">
        <strong>Situation actuelle</strong>
        <p id="assistant-situation-text">Les tendances financières seront affichées ici dès que vous aurez saisi vos revenus et dépenses.</p>
      </div>

      <!-- Diagnostic & Actions -->
      <div class="assistant-main-grid">
        <div class="assistant-analysis assistant-block">
          <strong>Diagnostics financiers</strong>
          <div id="assistant-analysis-content" class="assistant-analysis-bullets">
            <p style="font-size:13.5px;color:var(--text2)">Les informations clés apparaîtront ici dès que vous aurez saisi vos revenus et dépenses.</p>
          </div>
        </div>
        <div class="assistant-block assistant-vigilance">
          <strong>Vigilance</strong>
          <ul id="assistant-vigilance-list"></ul>
        </div>
        <div class="assistant-block assistant-action">
          <strong>Plan d'action</strong>
          <ul id="assistant-action-list"></ul>
        </div>
      </div>

      <!-- KPI Quick View -->
      <div class="assistant-block assistant-kpis" id="assistant-kpis-block">
        <div class="assistant-kpis-grid" id="assistant-kpis-grid">
          <!-- KPIs inserted here -->
        </div>
      </div>

      <!-- Advanced Insights -->
      <div class="assistant-block assistant-advanced-insights" id="assistant-insights-block" style="display:none;">
        <strong>Insights financiers avancés</strong>
        <div class="assistant-advanced-grid" id="assistant-advanced-grid"></div>
      </div>

      <!-- Charts Section -->
      <div class="assistant-block assistant-charts-section" id="assistant-charts-block" style="display:none;">
        <strong>Évolutions (12 mois)</strong>
        <div class="assistant-chart-grid" id="assistant-charts-grid"></div>
      </div>

      <!-- Visual Projections Section -->
      <div class="assistant-block assistant-projections-section" id="assistant-projections-block" style="display:none;">
        <strong>Projections & Rythmes d'Épargne</strong>
        <div class="assistant-projections-grid" id="assistant-projections-grid"></div>
      </div>

      <!-- Forecasts Section -->
      <div class="assistant-block assistant-forecast-section" id="assistant-forecast-block" style="display:none;">
        <strong>Prévisions financières</strong>
        <div class="assistant-forecast-grid" id="assistant-forecast-grid"></div>
      </div>

      <!-- Visual Timeline Section -->
      <div class="assistant-block assistant-timeline-section" id="assistant-timeline-block" style="display:none;">
        <strong>Timeline des Objectifs</strong>
        <div class="assistant-timeline-wrap">
          <div class="vertical-timeline-line"></div>
          <div class="assistant-timeline-items" id="assistant-timeline-items"></div>
        </div>
      </div>
    </div>
  `

  const style = document.createElement('style')
  style.id = 'nexora-assistant-card-styles'
  style.textContent = `
    .assistant-card {
      padding: 18px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      border: 1px solid rgba(229,192,96,0.18);
      box-shadow: 0 18px 40px rgba(0,0,0,0.18);
    }
    .assistant-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .assistant-labels {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .assistant-eyebrow {
      text-transform: uppercase;
      color: var(--gold);
      letter-spacing: 1px;
      font-size: 10px;
      font-weight: 800;
    }
    .assistant-title {
      font-size: 18px;
      line-height: 1.2;
      color: var(--text);
      margin-top: 6px;
    }
    .assistant-badge {
      padding: 6px 10px;
      background: rgba(229,192,96,0.12);
      color: var(--gold);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .assistant-trajectory {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: fit-content;
    }
    .assistant-trajectory.healthy {
      background: rgba(34,197,94,0.12);
      color: var(--green);
      border: 1px solid rgba(34,197,94,0.18);
    }
    .assistant-trajectory.neutral {
      background: rgba(250,204,21,0.12);
      color: var(--yellow);
      border: 1px solid rgba(250,204,21,0.18);
    }
    .assistant-trajectory.attention {
      background: rgba(250,159,26,0.12);
      color: #f59e0b;
      border: 1px solid rgba(250,159,26,0.18);
    }
    .assistant-trajectory.critical {
      background: rgba(244,63,94,0.12);
      color: var(--red);
      border: 1px solid rgba(244,63,94,0.18);
    }
    .assistant-body {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .assistant-main-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .assistant-situation, .assistant-analysis, .assistant-block {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 14px;
      min-height: 88px;
    }
    .assistant-situation p {
      font-size: 14px;
      line-height: 1.5;
      color: var(--text);
      margin: 0;
    }
    .assistant-block strong, .assistant-analysis strong, .assistant-situation strong {
      display: block;
      font-size: 11px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 10px;
    }
    .assistant-vigilance ul, .assistant-action ul {
      margin: 0;
      padding-left: 18px;
      list-style: disc;
    }
    .assistant-vigilance li, .assistant-action li {
      font-size: 13.5px;
      line-height: 1.45;
      color: var(--text2);
      margin-bottom: 8px;
    }
    .assistant-vigilance li:last-child, .assistant-action li:last-child {
      margin-bottom: 0;
    }

    /* Diagnostics Bullets */
    .assistant-analysis-bullets {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .assistant-analysis-bullet-item {
      font-size: 13.5px;
      line-height: 1.45;
      color: var(--text);
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .assistant-analysis-bullet-icon {
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Projections Styles */
    .assistant-projections-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0 !important;
    }
    .assistant-projections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }
    .assistant-forecast-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0 !important;
    }
    .assistant-forecast-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .forecast-card {
      padding: 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 100px;
    }
    .forecast-card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .forecast-card-era {
      font-size: 12px;
      color: var(--text2);
    }
    .forecast-card-detail {
      font-size: 13px;
      line-height: 1.4;
      color: var(--text);
    }
    /* Make embedded SVGs/canvases/images responsive to avoid horizontal overflow */
    .assistant-card svg, .assistant-card canvas, .assistant-card img {
      max-width: 100%;
      height: auto !important;
      display: block;
    }
    .proj-card-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      justify-content: space-between;
    }
    .proj-speeds {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 4px;
    }
    .proj-speed-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.2s ease;
    }
    .proj-speed-item.recommended {
      border-color: rgba(229, 192, 96, 0.25);
      background: rgba(229, 192, 96, 0.03);
    }
    .proj-speed-label {
      font-size: 9px;
      color: var(--text2);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .proj-speed-val {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
    }
    .proj-speed-save {
      font-size: 9.5px;
      color: var(--green);
      font-weight: 700;
    }
    .proj-speed-val.null-rate {
      font-size: 11px;
      color: var(--red);
    }

    /* Visual Timeline Styles */
    .assistant-timeline-section {
      min-height: 0 !important;
      padding-bottom: 8px !important;
    }
    .assistant-timeline-wrap {
      position: relative;
      margin-top: 14px;
      padding-left: 20px;
    }
    .vertical-timeline-line {
      position: absolute;
      top: 4px;
      bottom: 4px;
      left: 6px;
      width: 2px;
      background: linear-gradient(180deg, var(--gold) 0%, rgba(255, 255, 255, 0.05) 100%);
    }
    .assistant-timeline-items {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .timeline-node {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .timeline-badge {
      position: absolute;
      left: -20px;
      top: 12px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--gold);
      box-shadow: 0 0 10px var(--gold);
      border: 3px solid #07070d;
      z-index: 2;
    }
    .timeline-node-card {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      padding: 10px 14px;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .timeline-node-date {
      font-size: 11px;
      font-weight: 700;
      color: var(--gold);
      background: rgba(229, 192, 96, 0.08);
      border: 1px solid rgba(229, 192, 96, 0.2);
      padding: 4px 8px;
      border-radius: 999px;
      text-transform: capitalize;
    }
    .timeline-node-info {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* KPI grid */
    .assistant-kpis {
      display: block;
    }
    .assistant-kpis-grid,
    .assistant-advanced-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-top: 8px;
    }
    .kpi-card,
    .insight-card,
    .risk-card {
      padding: 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.03);
      display:flex;
      flex-direction:column;
      gap:6px;
    }
    .insight-card-title,
    .risk-card-title {
      font-size: 11px;
      color: var(--text2);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.7px;
    }
    .insight-card-value,
    .risk-card-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
    }
    .risk-card-value.critical {
      color: var(--red);
    }
    .risk-card-value.high {
      color: #f59e0b;
    }
    .risk-card-value.medium {
      color: var(--yellow);
    }
    .risk-card-value.low {
      color: var(--green);
    }
    .kpi-title { font-size:11px;color:var(--text2); text-transform:uppercase; font-weight:700 }
    .kpi-value { font-size:16px; font-weight:800; color:var(--text) }
    .assistant-chart-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin-top:10px }
    .chart-card { padding:8px; border-radius:10px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.03) }
    .sparkline { width:100%; height:48px; display:block }

    /* Skeleton loader for async states */
    .assistant-card.loading .skeleton-row {
      height: 12px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.06), rgba(255,255,255,0.04));
      border-radius: 6px;
      animation: shimmer 1.4s infinite linear;
      margin-bottom: 8px;
    }
    @keyframes shimmer { 0% { background-position: -200px 0 } 100% { background-position: 200px 0 } }

    @media(max-width: 960px) {
      .assistant-main-grid {
        grid-template-columns: 1fr;
      }
    }
    @media(max-width: 640px) {
      .assistant-card {
        padding: 14px;
      }
      .assistant-block {
        padding: 12px;
      }
      .assistant-situation {
        padding: 12px;
      }
    }
    @media(max-width: 576px) {
      .proj-speeds {
        grid-template-columns: 1fr;
        gap: 6px;
      }
      .timeline-node-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      .timeline-node-date {
        align-self: flex-start;
      }
    }
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

  // show lightweight skeleton while computing
  existing.classList.add('loading')
  const skeletonAnalysisEl = existing.querySelector('#assistant-analysis-content')
  if (skeletonAnalysisEl) {
    skeletonAnalysisEl.innerHTML = '<div class="skeleton-row" style="width:80%"></div><div class="skeleton-row" style="width:60%"></div><div class="skeleton-row" style="width:90%"></div>'
  }
  const result = await analyzeBudget()
  existing.classList.remove('loading')
  const situationEl = existing.querySelector('#assistant-situation-text')
  const trajectoryEl = existing.querySelector('#assistant-trajectory')
  const vigilanceList = existing.querySelector('#assistant-vigilance-list')
  const actionList = existing.querySelector('#assistant-action-list')

  if (trajectoryEl) {
    trajectoryEl.textContent = result.trajectoryLabel || 'Analyse en cours'
    trajectoryEl.className = `assistant-trajectory ${result.status || 'neutral'}`
  }

  if (situationEl) {
    situationEl.textContent = result.currentSituation || 'Les tendances financières seront affichées ici.'
  }

  // Populate formatted structured bullet points for Analysis
  const analysisContentEl = existing.querySelector('#assistant-analysis-content')
  if (analysisContentEl) {
    analysisContentEl.innerHTML = ''
    const paragraphs = (result.naturalAnalysis || '')
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean)

    if (paragraphs.length > 0) {
      paragraphs.forEach(text => {
        const item = document.createElement('div')
        item.className = 'assistant-analysis-bullet-item'

        let icon = '💡'
        if (/déficit|attention|critique|négatif/i.test(text)) icon = '⚠️'
        else if (/félicitations|bravo|excellent|saine/i.test(text)) icon = '🌟'
        else if (/charges|fixes|dépenses/i.test(text)) icon = '📈'

        item.innerHTML = `
          <span class="assistant-analysis-bullet-icon">${icon}</span>
          <span>${text}</span>
        `
        analysisContentEl.appendChild(item)
      })
    } else {
      analysisContentEl.innerHTML = '<p style="font-size:13.5px;color:var(--text2)">Aucune observation pour ce cycle.</p>'
    }
  }

  const renderItems = (el, items, limit = 3) => {
    if (!el) return
    el.innerHTML = ''
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

  // Vigilance -> show natural alert phrases
  renderItems(vigilanceList, result.alertDisplay || result.alerts, 3)
  // Action -> show recommendations
  renderItems(actionList, result.recommendations, 3)

  // Populate formatted visual comparison for savings projections
  const projectionsBlock = existing.querySelector('#assistant-projections-block')
  const projectionsGrid = existing.querySelector('#assistant-projections-grid')
  const forecastBlock = existing.querySelector('#assistant-forecast-block')
  const forecastGrid = existing.querySelector('#assistant-forecast-grid')

  if (Array.isArray(result.goalProjections) && result.goalProjections.length > 0) {
    if (projectionsBlock) projectionsBlock.style.display = 'flex'
    if (projectionsGrid) {
      projectionsGrid.innerHTML = result.goalProjections.map(proj => {
        const remainingStr = typeof window.Utils?.formatCurrency === 'function'
          ? window.Utils.formatCurrency(proj.remaining)
          : `${proj.remaining} €`

        const currentSpeed = proj.currentMonths !== null ? `${proj.currentMonths} mois` : '–'
        const speed50 = proj.months50 !== null ? `${proj.months50} mois` : '–'
        const speed100 = proj.months100 !== null ? `${proj.months100} mois` : '–'

        let save50 = ''
        if (proj.currentMonths !== null && proj.months50 !== null) {
          const diff = proj.currentMonths - proj.months50
          if (diff > 0) save50 = `<span class="proj-speed-save">🚀 Gagne ${diff}m</span>`
        }

        let save100 = ''
        if (proj.currentMonths !== null && proj.months100 !== null) {
          const diff = proj.currentMonths - proj.months100
          if (diff > 0) save100 = `<span class="proj-speed-save">🔥 Gagne ${diff}m</span>`
        }

        return `
          <div class="proj-card">
            <div class="proj-card-title">
              <span>🎯 ${proj.name}</span>
              <span style="color:var(--gold)">Reste : ${remainingStr}</span>
            </div>
            <div class="proj-speeds">
              <div class="proj-speed-item recommended">
                <span class="proj-speed-label">Rythme actuel</span>
                <span class="proj-speed-val ${proj.currentMonths === null ? 'null-rate' : ''}">
                  ${proj.currentMonths === null ? 'sans rythme' : currentSpeed}
                </span>
                <span class="proj-speed-save" style="color:var(--text2)">cible : ${proj.eta || '—'}</span>
              </div>
              <div class="proj-speed-item">
                <span class="proj-speed-label">+50 €/mois</span>
                <span class="proj-speed-val">${speed50}</span>
                ${save50}
              </div>
              <div class="proj-speed-item">
                <span class="proj-speed-label">+100 €/mois</span>
                <span class="proj-speed-val">${speed100}</span>
                ${save100}
              </div>
            </div>
          </div>
        `
      }).join('')
    }
  } else {
    if (projectionsBlock) projectionsBlock.style.display = 'none'
  }

  // Populate KPI quick view
  const kpisBlock = existing.querySelector('#assistant-kpis-block')
  const kpisGrid = existing.querySelector('#assistant-kpis-grid')
  if (kpisGrid && result.kpis) {
    kpisBlock.style.display = 'block'
    kpisGrid.innerHTML = `
      <div class="kpi-card"><div class="kpi-title">Taux d'épargne réel</div><div class="kpi-value">${result.kpis.realSavingsRate}%</div></div>
      <div class="kpi-card"><div class="kpi-title">Reste à vivre / jour</div><div class="kpi-value">${result.kpis.dailyLeftover} €</div></div>
      <div class="kpi-card"><div class="kpi-title">Projection fin d'année</div><div class="kpi-value">${result.kpis.projectionEndOfYear} €</div></div>
      <div class="kpi-card"><div class="kpi-title">Projection épargne annuelle</div><div class="kpi-value">${result.kpis.annualSavingsProjection} €</div></div>
    `
  } else if (kpisBlock) {
    kpisBlock.style.display = 'none'
  }

  // Populate advanced insights
  const insightsBlock = existing.querySelector('#assistant-insights-block')
  const insightsGrid = existing.querySelector('#assistant-advanced-grid')
  if (insightsGrid && result.advancedFinancialInsights && result.advancedFinancialInsights.length > 0) {
    insightsBlock.style.display = 'block'
    insightsGrid.innerHTML = [
      `<div class="risk-card"><div class="risk-card-title">Indice de santé financière</div><div class="risk-card-value ${result.riskAnalysis?.riskLevel || 'low'}">${result.financialHealthIndex}%</div><div style="font-size:12px;color:var(--text2);margin-top:6px">Score premium basé sur stabilité, charges, et objectifs.</div></div>`,
      `<div class="risk-card"><div class="risk-card-title">Risque financier</div><div class="risk-card-value ${result.riskAnalysis?.riskLevel || 'low'}">${(result.riskAnalysis?.riskScore ?? 0)} / 100</div><div style="font-size:12px;color:var(--text2);margin-top:6px">Niveau : ${result.riskAnalysis?.riskLevel || 'low'}</div></div>`,
      ...result.advancedFinancialInsights.slice(0, 2).map(text => `<div class="insight-card"><div class="insight-card-title">Insight</div><div class="insight-card-value">${text}</div></div>`),
      ...result.advancedRecommendations.slice(0, 2).map(text => `<div class="insight-card"><div class="insight-card-title">Recommandation</div><div class="insight-card-value">${text}</div></div>`)
    ].join('')
  } else if (insightsBlock) {
    insightsBlock.style.display = 'none'
  }

  // Simple lightweight sparklines (revenus/dépenses/épargne/solde)
  const chartsWrap = existing.querySelector('#assistant-charts-grid')
  const renderSparklines = (series) => {
    if (!Array.isArray(series) || series.length === 0) return ''
    const w = 160, h = 48
    const max = Math.max(...series, 1)
    const min = Math.min(...series, 0)
    const range = Math.max(1, max - min)
    const step = w / Math.max(1, series.length - 1)
    const points = series.map((v,i)=> `${i*step},${h - ((v - min)/range)*h}`).join(' ')
    return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="rgba(229,192,96,0.9)" stroke-width="2" points="${points}"/></svg>`
  }

  // attempt to sample last 12 months using getMonthMetrics when available
  const addMonthsLocal = (date, months) => { const r = new Date(date); r.setMonth(r.getMonth() + months); return r }
  const formatMonthYearLocal = (date) => date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  const now = new Date()
  const months = []
  for (let i=11;i>=0;i--) months.push(addMonthsLocal(now, -i))
  const revSeries = []
  const expSeries = []
  const savSeries = []
  const balSeries = []
  try {
    months.forEach(d => {
      let m = null
      if (typeof getMonthMetrics === 'function') {
        m = getMonthMetrics(formatMonthYearLocal(d), { fromDom: true })
      }
      m = m || { income: result.metadata.rev || 0, expenses: result.metadata.totalCharges || 0, savings: result.metadata.savings || 0 }
      revSeries.push(Number(m.income || 0))
      expSeries.push(Number(m.expenses || (Number(m.fixed||0)+Number(m.variable||0))))
      savSeries.push(Number(m.savings || (Number(m.income||0) - Number(m.expenses||0))))
      balSeries.push((Number(m.income||0) - Number(m.expenses||0)))
    })
  } catch (e) {
    // fallback to current month repeated
    for (let i=0;i<12;i++) { revSeries.push(result.metadata.rev||0); expSeries.push(result.metadata.totalCharges||0); savSeries.push(result.metadata.savings||0); balSeries.push((result.metadata.rev||0)-(result.metadata.totalCharges||0)) }
  }

  if (chartsWrap) {
    // create 4 small chart cards
    chartsWrap.innerHTML = `
      <div class="chart-card"><div style="font-size:12px;color:var(--text2);font-weight:700">Revenus (12m)</div>${renderSparklines(revSeries)}</div>
      <div class="chart-card"><div style="font-size:12px;color:var(--text2);font-weight:700">Dépenses (12m)</div>${renderSparklines(expSeries)}</div>
      <div class="chart-card"><div style="font-size:12px;color:var(--text2);font-weight:700">Épargne (12m)</div>${renderSparklines(savSeries)}</div>
      <div class="chart-card"><div style="font-size:12px;color:var(--text2);font-weight:700">Solde (12m)</div>${renderSparklines(balSeries)}</div>
    `
  }

  if (Array.isArray(result.budgetForecasts) && result.budgetForecasts.length > 0) {
    if (forecastBlock) forecastBlock.style.display = 'flex'
    if (forecastGrid) {
      forecastGrid.innerHTML = result.budgetForecasts.map(item => {
        const formattedBalance = typeof window.Utils?.formatCurrency === 'function'
          ? window.Utils.formatCurrency(item.projectedBalance)
          : `${item.projectedBalance} €`
        const savings = typeof window.Utils?.formatCurrency === 'function'
          ? window.Utils.formatCurrency(item.cumulativeSavings)
          : `${item.cumulativeSavings} €`
        const expenses = typeof window.Utils?.formatCurrency === 'function'
          ? window.Utils.formatCurrency(item.cumulativeExpenses)
          : `${item.cumulativeExpenses} €`

        return `
          <div class="forecast-card">
            <div class="forecast-card-title">
              <span>${item.label}</span>
              <span>${formattedBalance}</span>
            </div>
            <div class="forecast-card-era">Projection du solde sur ${item.label}</div>
            <div class="forecast-card-detail">Épargne cumulée : ${savings}, dépenses cumulées : ${expenses}</div>
          </div>
        `
      }).join('')
    }
  } else {
    if (forecastBlock) forecastBlock.style.display = 'none'
  }

  // Populate formatted milestone vertical timeline
  const timelineBlock = existing.querySelector('#assistant-timeline-block')
  const timelineItems = existing.querySelector('#assistant-timeline-items')

  const timelineData = Array.isArray(result.goalProjections)
    ? result.goalProjections.filter(p => p.eta && p.currentMonths !== null).sort((a, b) => a.currentMonths - b.currentMonths).slice(0, 3)
    : []

  if (timelineData.length > 0) {
    if (timelineBlock) timelineBlock.style.display = 'flex'
    if (timelineItems) {
      timelineItems.innerHTML = timelineData.map(p => {
        return `
          <div class="timeline-node">
            <div class="timeline-badge"></div>
            <div class="timeline-node-card">
              <div class="timeline-node-info">
                <span>🎯</span>
                <strong>${p.name}</strong>
              </div>
              <span class="timeline-node-date">${p.eta}</span>
            </div>
          </div>
        `
      }).join('')
    }
  } else {
    if (timelineBlock) timelineBlock.style.display = 'none'
  }

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
