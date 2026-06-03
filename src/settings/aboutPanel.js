import { formatBuildLabel, APP_VERSION } from '../app/buildInfo.js'
import { getSyncStatusSnapshot } from '../app/syncStatus.js'

const formatSyncDate = (iso) => {
  if (!iso) return 'Jamais synchronisé avec le cloud'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Date de sync inconnue'
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function renderAboutPanel(rootId = 'nexora-about-panel') {
  const root = document.getElementById(rootId)
  if (!root) return

  const sync = getSyncStatusSnapshot()
  const onlineClass = sync.online ? 'is-online' : 'is-offline'

  root.innerHTML = `
    <div class="settings-group-title">À propos &amp; diagnostic</div>
    <div class="param-block nexora-about-block">
      <div class="param-row">
        <div>
          <div class="param-label">Version Nexora</div>
          <div class="nexora-about-meta">${formatBuildLabel()}</div>
        </div>
        <span class="nexora-version-badge">RC ${APP_VERSION}</span>
      </div>
      <div class="param-row">
        <div>
          <div class="param-label">État de synchronisation</div>
          <div class="nexora-about-meta nexora-sync-status ${onlineClass}" id="nexora-sync-status-label">${sync.label}</div>
        </div>
        <span class="nexora-sync-dot ${onlineClass}" aria-hidden="true"></span>
      </div>
      <p class="nexora-about-meta" id="nexora-sync-status-detail">
        Dernière synchronisation : ${formatSyncDate(sync.lastAt)}
        ${sync.lastAction ? ` · ${sync.lastAction}` : ''}
      </p>
      <p class="nexora-about-hint">En cas de problème, indiquez cette version et l’heure de dernière sync au support.</p>
    </div>
  `
}

export function refreshAboutPanel() {
  renderAboutPanel()
}

export default { renderAboutPanel, refreshAboutPanel }
