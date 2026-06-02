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
  const impact = formatCurrencyImpact(getField(outcome, ['impact', 'endingBalance'], 'Aucun impact clair détecté'))
  const risk = normalizeRisk(getField(outcome, ['risk'], 'Modéré'))
  const advice = getField(outcome, ['recommendation', 'advice', 'rationale'], 'Vérifie le Plan avant de décider.')
  const loweredQuery = String(query || '').toLowerCase()

  let today = verdict === 'Non recommandé'
    ? 'N’engage pas cette dépense maintenant.'
    : verdict === 'À prioriser'
      ? 'Concentre-toi sur cette priorité aujourd’hui.'
      : 'Tu peux avancer, mais garde une marge.'

  if (loweredQuery.includes('objectif')) today = verdict === 'Non recommandé' ? 'Garde ton argent disponible pour le moment.' : 'Tu peux alimenter ton objectif prudemment.'
  if (loweredQuery.includes('dette')) today = 'Priorise la dette la plus coûteuse ou la plus urgente.'
  if (loweredQuery.includes('vert') || loweredQuery.includes('positif')) today = verdict === 'Non recommandé' ? 'Surveille tes paiements avant la fin du mois.' : 'Le mois semble tenir si tu gardes le cap.'

  const why = impact === 'Aucun impact clair détecté'
    ? `Risque estimé : ${risk}.`
    : `Impact estimé : ${impact}. Risque : ${risk}.`

  const nextTarget = loweredQuery.includes('objectif') ? 'objectifs' : loweredQuery.includes('budget') ? 'saisie' : 'plan'
  const nextLabel = nextTarget === 'objectifs' ? 'Voir l’objectif' : nextTarget === 'saisie' ? 'Voir le Budget' : 'Voir le Plan'

  return { today, why, advice, nextTarget, nextLabel }
}

export function renderAdvisorUI(rootId, AdvisorService) {
  const root = document.getElementById(rootId)
  if (!root) return

  root.innerHTML = `
    <section class="advisor-page">
      <div class="advisor-greeting" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <span style="font-size:13px;color:var(--text2);">Bonjour Ali 👋</span>
            <h3 style="margin:6px 0 4px;font-size:18px;">Je suis Nexora. Situation actuelle</h3>
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
        <div class="advisor-result-card advisor-verdict">
          <span>🎯 Aujourd’hui</span>
          <strong id="advisor-result-today">-</strong>
        </div>
        <div class="advisor-result-grid">
          <div class="advisor-result-card">
            <span>Pourquoi ?</span>
            <strong id="advisor-result-why">-</strong>
          </div>
          <div class="advisor-result-card advisor-recommendation">
            <span>Action recommandée</span>
            <p id="advisor-result-action">-</p>
          </div>
        </div>
        <button class="btn btn-gold advisor-next-btn" id="advisor-next-action" type="button">Voir le Plan</button>
      </div>
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
    root.querySelector('#advisor-result-action').textContent = coach.advice
    const nextBtn = root.querySelector('#advisor-next-action')
    if (nextBtn) {
      nextBtn.textContent = coach.nextLabel
      nextBtn.onclick = () => window.showSection?.(coach.nextTarget)
    }
  }

  const runQuery = async (query) => {
    const normalizedQuery = String(query || '').trim()
    if (!normalizedQuery) return
    input.value = normalizedQuery
    btn.disabled = true
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
}
