export function renderAdvisorUI(rootId, AdvisorService) {
  const root = document.getElementById(rootId)
  if (!root) return
  root.classList.add('dash-mini-card', 'fade-in')
  root.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <label style="font-size:13px;color:var(--text2)">Conseiller Nexora</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="advisor-input" placeholder="Ex: Puis-je acheter un vélo à 400€ ?" style="flex:1;min-width:160px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--text)" />
        <button id="advisor-btn" class="btn btn-outline">Analyser</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
        <button class="btn btn-outline" data-q="Puis-je acheter un vélo à 200€ ?">Puis-je faire un achat ?</button>
        <button class="btn btn-outline" data-q="Vais-je finir le mois dans le vert ?">Finir le mois dans le vert ?</button>
        <button class="btn btn-outline" data-q="Quelle dette rembourser ?">Quelle dette rembourser ?</button>
        <button class="btn btn-outline" data-q="Puis-je alimenter un objectif ?">Alimenter un objectif ?</button>
      </div>
      <div id="advisor-result" style="font-size:13px;color:var(--text2);display:flex;flex-direction:column;gap:6px;margin-top:8px"></div>
    </div>
  `

  const input = root.querySelector('#advisor-input')
  const btn = root.querySelector('#advisor-btn')
  const res = root.querySelector('#advisor-result')
  const renderStructured = (outcome) => {
    res.innerHTML = ''
    const verdict = document.createElement('div')
    verdict.innerHTML = `<strong>Verdict:</strong> ${outcome.verdict || outcome.canAfford ? (outcome.verdict || (outcome.canAfford ? 'ok' : 'no')) : 'N/A'}`
    const impact = document.createElement('div')
    impact.innerHTML = `<strong>Impact:</strong> ${typeof outcome.impact !== 'undefined' ? outcome.impact : (typeof outcome.endingBalance !== 'undefined' ? outcome.endingBalance : 'N/A')}`
    const risk = document.createElement('div')
    risk.innerHTML = `<strong>Risque:</strong> ${outcome.risk || 'N/A'}`
    const advice = document.createElement('div')
    advice.innerHTML = `<strong>Conseil:</strong> ${outcome.advice || outcome.rationale || 'Aucun conseil'}`
    res.appendChild(verdict)
    res.appendChild(impact)
    res.appendChild(risk)
    res.appendChild(advice)
  }

  btn.addEventListener('click', async () => {
    const q = input.value || ''
    try {
      const outcome = await AdvisorService.evaluateQuery({ query: q })
      renderStructured(outcome)
    } catch (e) {
      res.textContent = 'Erreur lors de l’analyse'
    }
  })

  // Quick question buttons
  Array.from(root.querySelectorAll('button[data-q]')).forEach(b => {
    b.addEventListener('click', async () => {
      const q = b.getAttribute('data-q') || ''
      try {
        const outcome = await AdvisorService.evaluateQuery({ query: q })
        renderStructured(outcome)
      } catch (e) { res.textContent = 'Erreur lors de l’analyse' }
    })
  })
}
