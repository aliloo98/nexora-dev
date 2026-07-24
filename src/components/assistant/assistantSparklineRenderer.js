export const renderSparklines = (series) => {
  if (!Array.isArray(series) || series.length < 2) return `<div style="font-size:13px;color:var(--text2)">Pas encore assez d'historique — ajoutez plusieurs mois pour voir l'évolution</div>`
  // consider there is data only when at least one non-zero value exists
  const hasData = series.some(v => typeof v === 'number' && !isNaN(v) && Number(v) !== 0)
  if (!hasData) return `<div style="font-size:13px;color:var(--text2)">Pas encore assez d'historique — ajoutez plusieurs mois pour voir l'évolution</div>`
  const w = 160, h = 48
  const max = Math.max(...series, 1)
  const min = Math.min(...series, 0)
  const range = Math.max(1, max - min)
  const step = w / Math.max(1, series.length - 1)
  const points = series.map((v,i)=> `${i*step},${h - ((v - min)/range)*h}`).join(' ')
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="rgba(229,192,96,0.9)" stroke-width="2" points="${points}"/></svg>`
}
