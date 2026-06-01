export function renderAdvisorUI(rootId, AdvisorService) {
  const root = document.getElementById(rootId)
  if (!root) return
  root.classList.add('dash-mini-card', 'fade-in')
  root.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <label style="font-size:13px;color:var(--text2)">Conseiller Nexora</label>
      <div style="display:flex;gap:8px">
        <input id="advisor-input" placeholder="Ex: Puis-je acheter un vélo à 400€ ?" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--text)" />
        <button id="advisor-btn" class="btn btn-outline">Analyser</button>
      </div>
      <div id="advisor-result" style="font-size:13px;color:var(--text2)"></div>
    </div>
  `

  const input = root.querySelector('#advisor-input')
  const btn = root.querySelector('#advisor-btn')
  const res = root.querySelector('#advisor-result')

  btn.addEventListener('click', async () => {
    const q = input.value || ''
    try {
      const outcome = await AdvisorService.evaluatePurchase({ query: q })
      res.textContent = outcome?.message || 'Aucun résultat'
    } catch (e) {
      res.textContent = 'Erreur lors de l’analyse'
    }
  })
}
