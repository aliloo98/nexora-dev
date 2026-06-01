const quickQuestions = [
  { label: 'Can I make a purchase?', query: 'Can I make a purchase?' },
  { label: 'Will I finish the month positive?', query: 'Will I finish the month positive?' },
  { label: 'Which debt should I repay?', query: 'Which debt should I repay?' },
  { label: 'Can I fund a goal?', query: 'Can I fund a goal?' }
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
        <label for="advisor-input">Ask Nexora</label>
        <div class="advisor-input-row">
          <input id="advisor-input" type="text" placeholder="Can I spend 200 € this week?" autocomplete="off" />
          <button id="advisor-btn" class="btn btn-gold" type="button">Analyze</button>
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
            <span>Risk</span>
            <strong id="advisor-result-risk">-</strong>
          </div>
          <div class="advisor-result-card advisor-recommendation">
            <span>Recommendation</span>
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
    const verdict = getField(outcome, ['verdict'], outcome.canAfford ? 'Possible' : 'Not recommended')
    const impact = getField(outcome, ['impact', 'endingBalance'], 'No clear impact detected')
    const risk = getField(outcome, ['risk'], 'Moderate')
    const advice = getField(outcome, ['recommendation', 'advice', 'rationale'], 'Check the plan before committing.')

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
    btn.textContent = 'Analyzing'
    try {
      const outcome = await AdvisorService.evaluateQuery({ query: normalizedQuery })
      renderResult(outcome)
    } catch (e) {
      resultDiv.hidden = false
      root.querySelector('#advisor-result-verdict').textContent = 'Analysis unavailable'
      root.querySelector('#advisor-result-impact').textContent = 'No budget change applied'
      root.querySelector('#advisor-result-risk').textContent = 'Unknown'
      root.querySelector('#advisor-result-advice').textContent = 'Try again after updating the budget.'
    } finally {
      btn.disabled = false
      btn.textContent = 'Analyze'
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
