const CoupleOverlay = {
  show: () => {
    let el = document.getElementById('couple-overlay')
    if (!el) {
      el = document.createElement('div')
      el.id = 'couple-overlay'
      el.style.position = 'fixed'
      el.style.right = '12px'
      el.style.bottom = '12px'
      el.style.background = 'var(--panel)'
      el.style.padding = '12px'
      el.style.borderRadius = '10px'
      el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)'
      el.innerHTML = `<strong>Mode Couple</strong><div style="font-size:13px;color:var(--text2);margin-top:6px">Paramètres et conversion foyer — travail en cours.</div><div style="margin-top:8px"><button class="btn btn-outline" onclick="document.getElementById('couple-overlay')?.remove()">Fermer</button></div>`
      document.body.appendChild(el)
    }
  }
}

export default CoupleOverlay
