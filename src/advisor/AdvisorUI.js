const quickQuestions = [
  { label: 'Puis-je faire un achat ?', query: 'Puis-je acheter un PC à 600 € ?' },
  { label: 'Vais-je finir le mois positif ?', query: 'Vais-je finir le mois dans le vert ?' },
  { label: 'Quelle dette rembourser ?', query: 'Quelle dette rembourser ?' },
  { label: 'Puis-je financer un objectif ?', query: 'Puis-je alimenter un objectif ?' }
]

const getField = (outcome, keys, fallback) => {
  for (const key of keys) {
    if (outcome?.[key] !== undefined && outcome?.[key] !== null && outcome?.[key] !== '') {
      return String(outcome[key])
    }
  }
  return fallback
}

export function renderAdvisorUI(rootId, AdvisorService) {
  const root = document.getElementById(rootId)
  if (!root) return

  root.innerHTML = `
    <section class="advisor-page">
      <div class="advisor-input-panel">
        <label for="advisor-input">Demander à Nexora</label>
        <div class="advisor-input-row">
          <input id="advisor-input" type="text" placeholder="Puis-je dépenser 200 € cette semaine ?" autocomplete="off" />
          <button id="advisor-btn" class="btn btn-gold" type="button">Analyser</button>
        </div>
      </div>

      <div class="advisor-quick-grid" aria-label="Questions rapides">
        ${quickQuestions.map((item) => `
          <button class="btn btn-outline" type="button" data-q="${item.query}">${item.label}</button>
        `).join('')}
      </div>

      <div id="advisor-result" class="advisor-result" hidden>
        <div class="advisor-result-card advisor-verdict">
          <span>Verdict</span>
          <strong id="advisor-result-verdict">-</strong>
        </div>
        <div class="advisor-result-grid">
          <div class="advisor-result-card">
            <span>Impact</span>
            <strong id="advisor-result-impact">-</strong>
          </div>
          <div class="advisor-result-card">
            <span>Risque</span>
            <strong id="advisor-result-risk">-</strong>
          </div>
          <div class="advisor-result-card advisor-recommendation">
            <span>Conseil</span>
            <p id="advisor-result-advice">-</p>
          </div>
        </div>
      </div>
    </section>
  `

  const input = root.querySelector('#advisor-input')
  const btn = root.querySelector('#advisor-btn')
  const resultDiv = root.querySelector('#advisor-result')

  const renderResult = (outcome = {}) => {
    resultDiv.hidden = false
    const verdict = getField(outcome, ['verdict'], outcome.canAfford ? 'Possible' : 'Non recommandé')
    const impact = getField(outcome, ['impact', 'endingBalance'], 'Aucun impact clair détecté')
    const risk = getField(outcome, ['risk'], 'Modéré')
    const advice = getField(outcome, ['recommendation', 'advice', 'rationale'], 'Vérifiez le plan avant de confirmer.')

    root.querySelector('#advisor-result-verdict').textContent = verdict
    root.querySelector('#advisor-result-impact').textContent = impact
    root.querySelector('#advisor-result-risk').textContent = risk
    root.querySelector('#advisor-result-advice').textContent = advice
  }

  const runQuery = async (query) => {
    const normalizedQuery = String(query || '').trim()
    if (!normalizedQuery) return
    input.value = normalizedQuery
    btn.disabled = true
    btn.textContent = 'Analyse'
    try {
      const outcome = await AdvisorService.evaluateQuery({ query: normalizedQuery })
      renderResult(outcome)
    } catch (e) {
      resultDiv.hidden = false
      root.querySelector('#advisor-result-verdict').textContent = 'Analyse indisponible'
      root.querySelector('#advisor-result-impact').textContent = 'Aucun changement appliqué au budget'
      root.querySelector('#advisor-result-risk').textContent = 'Inconnu'
      root.querySelector('#advisor-result-advice').textContent = 'Réessayez après avoir mis le budget à jour.'
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
