const quickQuestions = [
  { label: 'Puis-je faire un achat ?', query: 'Puis-je acheter un PC à 600 € ?' },
  { label: 'Vais-je finir le mois positif ?', query: 'Vais-je finir le mois dans le vert ?' },
  { label: 'Quelle dette rembourser ?', query: 'Quelle dette rembourser ?' },
  { label: 'Puis-je financer un objectif ?', query: 'Puis-je alimenter un objectif ?' }
]

const getField = (outcome, keys, fallback) => {
  for (const key of keys) {
    if (outcome?.[key] !== undefined && outcome?.[key] !== null && outcome?.[key] !== '') {
      const value = String(outcome[key])
      if (!/^(NaN|undefined|null)$/i.test(value.trim())) return value
    }
  }
  return fallback
}

const formatCurrencyImpact = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  const sign = amount > 0 ? '+' : ''
  return `${sign}${amount.toLocaleString('fr-FR')} €`
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const normalizeVerdict = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['ok', 'yes', 'possible', 'go'].includes(normalized)) return 'Possible'
  if (['no', 'blocked', 'non', 'refus'].includes(normalized)) return 'Non recommandé'
  if (['recommend', 'recommandation'].includes(normalized)) return 'À prioriser'
  return value
}

const normalizeRisk = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'haut' || normalized === 'high') return 'Élevé'
  if (normalized === 'moyen' || normalized === 'medium') return 'Modéré'
  if (normalized === 'bas' || normalized === 'low') return 'Faible'
  return value
}

const buildCoachMessage = (outcome = {}, query = '') => {
  const verdict = normalizeVerdict(getField(outcome, ['verdict'], outcome.canAfford ? 'Possible' : 'Non recommandé'))
  const impact = getField(outcome, ['impact', 'endingBalance'], 'Aucun impact clair détecté')
  const formattedImpact = typeof impact === 'number' ? formatCurrencyImpact(impact) : impact
  const risk = normalizeRisk(getField(outcome, ['risk'], 'Modéré'))
  const advice = getField(outcome, ['recommendation', 'advice', 'rationale'], 'Vérifie le Plan avant de décider.')
  const loweredQuery = String(query || '').toLowerCase()

  let today = getField(outcome, ['today'], verdict === 'Non recommandé'
    ? 'N’engage pas cette dépense maintenant.'
    : verdict === 'À prioriser'
      ? 'Concentre-toi sur cette priorité aujourd’hui.'
      : 'Tu peux avancer, mais garde une marge.')

  if (loweredQuery.includes('objectif')) today = verdict === 'Non recommandé' ? 'Garde ton argent disponible pour le moment.' : 'Tu peux alimenter ton objectif prudemment.'
  if (loweredQuery.includes('dette')) today = 'Priorise la dette la plus coûteuse ou la plus urgente.'
  if (loweredQuery.includes('vert') || loweredQuery.includes('positif')) today = verdict === 'Non recommandé' ? 'Surveille tes paiements avant la fin du mois.' : 'Le mois semble tenir si tu gardes le cap.'

  const why = getField(outcome, ['why'], formattedImpact === 'Aucun impact clair détecté'
    ? `Risque estimé : ${risk}.`
    : `Impact estimé : ${formattedImpact}. Risque : ${risk}.`)
  const alternative = getField(outcome, ['alternative'], 'Option plus sûre : garde une marge avant de décider.')
  const action = getField(outcome, ['action', 'recommendation', 'advice'], advice)

  const nextTarget = loweredQuery.includes('objectif') ? 'objectifs' : loweredQuery.includes('budget') ? 'saisie' : 'plan'
  const nextLabel = nextTarget === 'objectifs' ? 'Voir l’objectif' : nextTarget === 'saisie' ? 'Voir le Budget' : 'Voir le Plan'

  return { today, why, impact: formattedImpact, alternative, advice: action, nextTarget, nextLabel }
}

const renderList = (items = [], emptyText = 'Aucun point détecté') => {
  const list = Array.isArray(items) ? items.filter(Boolean) : []
  if (!list.length) return `<li>${emptyText}</li>`
  return list.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

const renderScenarioCards = (scenarios = []) => {
  const visible = Array.isArray(scenarios) ? scenarios.slice(0, 3) : []
  if (!visible.length) return '<div class="advisor-muted">Scénarios indisponibles pour le moment.</div>'
  return visible.map((scenario) => `
    <div class="advisor-scenario-card scenario-${escapeHtml(scenario.id || 'default')}">
      <div>
        <strong>${escapeHtml(scenario.label || 'Scénario')}</strong>
        <span>Risque ${escapeHtml(scenario.risk || 'modéré')}</span>
      </div>
      <p>Solde fin de cycle : ${(Number(scenario.projectedBalance) || 0).toLocaleString('fr-FR')} €</p>
      <p>Épargne possible : ${(Number(scenario.possibleSaving) || 0).toLocaleString('fr-FR')} €</p>
      <em>${escapeHtml(scenario.advice || 'Garde une marge de sécurité.')}</em>
    </div>
  `).join('')
}

const renderMemoryItems = (memory = {}) => {
  const items = []
  if (memory.lastRecommendation) items.push(`La dernière fois, je t’avais conseillé : ${memory.lastRecommendation}`)
  if (memory.lastPrimaryGoal) items.push(`Ton objectif principal reste ${memory.lastPrimaryGoal}.`)
  if (memory.recentProgress) items.push(`Progression récente : ${memory.recentProgress}.`)
  if (Array.isArray(memory.lastImportantAlerts) && memory.lastImportantAlerts[0]) {
    items.push(`Point déjà repéré : ${memory.lastImportantAlerts[0]}.`)
  }
  const uniqueItems = Array.from(new Set(items.filter(Boolean))).slice(0, 3)
  if (!uniqueItems.length) return ''
  return uniqueItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

export function renderAdvisorUI(rootId, AdvisorService) {
  const root = document.getElementById(rootId)
  if (!root) return

  root.innerHTML = `
    <section class="advisor-page">
      <div class="advisor-greeting" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <span id="advisor-greeting-hello" style="font-size:13px;color:var(--text2);">Bonjour 👋</span>
            <h3 style="margin:6px 0 4px;font-size:18px;">Nexora — coaching financier</h3>
            <div id="advisor-human-summary" style="font-size:13px;color:var(--text2);">Analyse ton budget et dis-moi ce que tu souhaites analyser.</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-outline" onclick="showSection('saisie')">Mettre à jour le budget</button>
            <button class="btn btn-gold" onclick="showSection('plan')">Ouvrir le plan</button>
          </div>
        </div>
      </div>

      <div class="advisor-input-panel">
        <label for="advisor-input">Que souhaitez-vous analyser ?</label>
        <div class="advisor-input-row">
          <input id="advisor-input" type="text" placeholder="Que souhaitez-vous analyser ?" autocomplete="off" />
          <button id="advisor-btn" class="btn btn-gold" type="button">Analyser</button>
        </div>
      </div>

      <div class="advisor-quick-grid" aria-label="Questions rapides">
        ${quickQuestions.map((item) => `
          <button class="btn btn-outline" type="button" data-q="${item.query}">${item.label}</button>
        `).join('')}
      </div>

      <div id="advisor-result" class="advisor-result coach-result" hidden>
        <div class="advisor-steps" aria-label="Réponse structurée">
          <span>1. Décision</span>
          <span>2. Impact</span>
          <span>3. Action</span>
        </div>
        <div class="advisor-result-card advisor-verdict">
          <span>🎯 Aujourd’hui</span>
          <strong id="advisor-result-today">-</strong>
        </div>
        <div class="advisor-result-grid">
          <div class="advisor-result-card">
            <span>Pourquoi ?</span>
            <strong id="advisor-result-why">-</strong>
          </div>
          <div class="advisor-result-card">
            <span>Impact</span>
            <strong id="advisor-result-impact">-</strong>
          </div>
          <div class="advisor-result-card">
            <span>Alternative</span>
            <strong id="advisor-result-alternative">-</strong>
          </div>
          <div class="advisor-result-card advisor-recommendation">
            <span>Action recommandée</span>
            <p id="advisor-result-action">-</p>
          </div>
        </div>
        <button class="btn btn-gold advisor-next-btn" id="advisor-next-action" type="button">Voir le Plan</button>
      </div>

      <div class="advisor-proactive-grid">
        <section class="advisor-result-card advisor-proactive-card">
          <span>Analyse proactive</span>
          <strong id="advisor-proactive-advice">Analyse en cours...</strong>
          <p id="advisor-proactive-priority">Priorité : -</p>
          <div class="advisor-proactive-columns">
            <div>
              <em>Risques</em>
              <ul id="advisor-proactive-risks"></ul>
            </div>
            <div>
              <em>Opportunités</em>
              <ul id="advisor-proactive-opportunities"></ul>
            </div>
          </div>
          <button class="btn btn-outline" id="advisor-proactive-action" type="button">Voir le Plan</button>
        </section>
        <section class="advisor-result-card advisor-scenarios-card">
          <span>Scénarios automatiques</span>
          <div id="advisor-scenarios-list" class="advisor-scenarios-list"></div>
        </section>
      </div>
      <section class="advisor-result-card advisor-memory-card" id="advisor-memory-card" hidden>
        <span>Mémoire Nexora</span>
        <strong>Continuité du coaching</strong>
        <ul id="advisor-memory-list" class="advisor-memory-list"></ul>
      </section>
    </section>
  `

  const input = root.querySelector('#advisor-input')
  const btn = root.querySelector('#advisor-btn')
  const resultDiv = root.querySelector('#advisor-result')

  const renderResult = (outcome = {}, query = '') => {
    resultDiv.hidden = false
    const coach = buildCoachMessage(outcome, query)

    root.querySelector('#advisor-result-today').textContent = coach.today
    root.querySelector('#advisor-result-why').textContent = coach.why
    root.querySelector('#advisor-result-impact').textContent = coach.impact
    root.querySelector('#advisor-result-alternative').textContent = coach.alternative
    root.querySelector('#advisor-result-action').textContent = coach.advice
    const nextBtn = root.querySelector('#advisor-next-action')
    if (nextBtn) {
      nextBtn.textContent = coach.nextLabel
      nextBtn.onclick = () => window.showSection?.(coach.nextTarget)
    }
    window.NexoraMotion?.animateAdvisorResponse?.(resultDiv)
  }

  const runQuery = async (query) => {
    const normalizedQuery = String(query || '').trim()
    if (!normalizedQuery) return
    input.value = normalizedQuery
    btn.disabled = true
    btn.classList.add('is-analyzing')
    btn.textContent = 'Analyse'
    try {
      const outcome = await AdvisorService.evaluateQuery({ query: normalizedQuery })
      renderResult(outcome, normalizedQuery)
    } catch (e) {
      resultDiv.hidden = false
      root.querySelector('#advisor-result-today').textContent = 'Reviens aux données du budget.'
      root.querySelector('#advisor-result-why').textContent = 'Nexora n’a pas assez d’informations fiables pour répondre.'
      root.querySelector('#advisor-result-action').textContent = 'Mets le budget à jour, puis relance la question.'
      const nextBtn = root.querySelector('#advisor-next-action')
      if (nextBtn) {
        nextBtn.textContent = 'Voir le Budget'
        nextBtn.onclick = () => window.showSection?.('saisie')
      }
    } finally {
      btn.disabled = false
      btn.classList.remove('is-analyzing')
      btn.textContent = 'Analyser'
    }
  }

  btn.addEventListener('click', () => runQuery(input.value))
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runQuery(input.value)
  })

  root.querySelectorAll('button[data-q]').forEach((button) => {
    button.addEventListener('click', () => runQuery(button.getAttribute('data-q')))
  })

  const hydrateProactive = async () => {
    const helloEl = root.querySelector('#advisor-greeting-hello')
    if (helloEl && window.AuthContext?.getUserDisplayName) {
      const name = window.AuthContext.getUserDisplayName()
      helloEl.textContent = name === 'Vous' ? 'Bonjour 👋' : `Bonjour ${name} 👋`
    }
    try {
      const [coach, scenarios] = await Promise.all([
        AdvisorService.getProactiveCoach ? AdvisorService.getProactiveCoach() : null,
        AdvisorService.getScenarios ? AdvisorService.getScenarios() : []
      ])
      if (coach) {
        root.querySelector('#advisor-proactive-advice').textContent = coach.dailyAdvice || 'Aucune action urgente aujourd’hui.'
        root.querySelector('#advisor-proactive-priority').textContent = `Priorité : ${coach.priority || 'Maintenir la marge'}`
        root.querySelector('#advisor-proactive-risks').innerHTML = renderList(coach.risks, 'Aucun risque majeur')
        root.querySelector('#advisor-proactive-opportunities').innerHTML = renderList(coach.opportunities, 'Aucune opportunité claire')
        const memoryHtml = renderMemoryItems(coach.memory)
        const memoryCard = root.querySelector('#advisor-memory-card')
        if (memoryCard) {
          memoryCard.hidden = !memoryHtml
          root.querySelector('#advisor-memory-list').innerHTML = memoryHtml
        }
        const actionBtn = root.querySelector('#advisor-proactive-action')
        if (actionBtn) {
          actionBtn.textContent = coach.actionLabel || 'Voir le Plan'
          actionBtn.onclick = () => window.showSection?.(coach.actionTarget || 'plan')
        }
      }
      root.querySelector('#advisor-scenarios-list').innerHTML = renderScenarioCards(scenarios)
      window.NexoraMotion?.animateAdvisorResponse?.(root.querySelector('.advisor-proactive-grid'))
      window.NexoraMotion?.animateAdvisorResponse?.(root.querySelector('#advisor-memory-card'))
    } catch (error) {
      root.querySelector('#advisor-proactive-advice').textContent = 'Je peux t’aider, mais il me manque encore tes revenus, tes charges ou ton objectif principal.'
      root.querySelector('#advisor-proactive-priority').textContent = 'Priorité : compléter les données'
      root.querySelector('#advisor-proactive-risks').innerHTML = renderList([], 'Données insuffisantes')
      root.querySelector('#advisor-proactive-opportunities').innerHTML = renderList([], 'Complète le budget pour les afficher')
      root.querySelector('#advisor-scenarios-list').innerHTML = renderScenarioCards([])
      const memoryCard = root.querySelector('#advisor-memory-card')
      if (memoryCard) memoryCard.hidden = true
    }
  }

  hydrateProactive()
  window.NexoraMotion?.animateCards?.(root)
}
