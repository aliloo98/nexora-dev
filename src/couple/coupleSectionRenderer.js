/**
 * Couple Section Renderer
 *
 * Responsible for rendering the Couple section HTML and managing its interactions.
 * Reads budget data, goals, debts and renders the collaborative couple view.
 */

/**
 * Create the Couple section renderer
 * @param {Object} dependencies
 * @param {Object} dependencies.CoupleService - Couple service for household and sharing operations
 * @param {Object} dependencies.GoalsService - Goals service for reading user goals
 * @param {Function} dependencies.readSyncedArray - Function to read synced arrays
 * @param {Function} dependencies.filterUserFacingRecords - Function to filter records
 * @param {Object} dependencies.storageKeys - Storage keys for data access
 * @param {Function} dependencies.parseFinancialExpression - Function to parse financial values
 * @param {Function} dependencies.escapeHtml - Function to escape HTML
 * @param {Function} dependencies.formatEuro - Function to format currency
 * @param {Function} dependencies.showToast - Function to show toast messages
 * @param {Function} dependencies.renderCoupleSection - Function to re-render the section (for callbacks)
 * @param {Object} dependencies.documentRef - Document reference (for DOM access)
 */
export function createCoupleSectionRenderer({
  CoupleService,
  GoalsService,
  readSyncedArray,
  filterUserFacingRecords,
  storageKeys,
  parseFinancialExpression,
  escapeHtml,
  formatEuro,
  showToast,
  renderCoupleSection,
  documentRef = document
}) {
  /**
   * Read current budget from DOM inputs
   * @returns {Object} Budget data with income, fixed, variable expenses
   */
  const readCurrentBudgetForCouple = () => {
    const read = (key) => parseFinancialExpression(documentRef.querySelector(`[data-key="${key}"]`)?.value || 0, { fallback: 0 })
    const income = ['rev_ali', 'rev_megane', 'rev_excep'].reduce((sum, key) => sum + read(key), 0)
    const fixed = ['loyer', 'credit', 'assauto', 'gasoil', 'elec', 'eau', 'psy', 'diete', 'itou', 'sante', 'impots', 'box', 'tel_ali', 'tel_meg', 'stream', 'ps', 'cb', 'impfix']
      .reduce((sum, key) => sum + read(key), 0)
    const variable = ['courses', 'tabac', 'sport', 'ongles', 'cadeaux', 'impvar']
      .reduce((sum, key) => sum + read(key), 0)
    return { income, fixed, variable, expenses: fixed + variable, remaining: income - fixed - variable }
  }

  /**
   * Create a share toggle control HTML
   * @param {string} type - Item type (goal, debt, income, charge)
   * @param {string} id - Item ID
   * @param {string} label - Display label
   * @returns {string} HTML for the toggle
   */
  const createShareToggle = (type, id, label) => {
    const checked = CoupleService.isLocalItemShared(type, id)
    return `
      <label class="couple-share-toggle">
        <span>${escapeHtml(label)}</span>
        <select data-share-type="${escapeHtml(type)}" data-share-id="${escapeHtml(id)}">
          <option value="private" ${checked ? '' : 'selected'}>Privé</option>
          <option value="shared" ${checked ? 'selected' : ''}>Partagé</option>
        </select>
      </label>
    `
  }

  /**
   * Render the Couple section
   * @returns {Promise<void>}
   */
  const renderCoupleSectionInternal = async () => {
    const section = documentRef.getElementById('section-couple')
    if (!section) return

    const household = CoupleService.getLocalHousehold()
    if (!household?.status || household.status !== 'active') {
      section.innerHTML = `
        <div class="budget-block">
          <div class="budget-block-header">
            <span class="budget-block-title">❤️ Couple</span>
            <span style="font-size:12px;color:var(--text2)">Inactif</span>
          </div>
          <div class="couple-empty-state">
            <strong>Aucun foyer actif</strong>
            <p>Active le mode couple dans les paramètres pour afficher l'espace foyer.</p>
            <button class="btn btn-gold" type="button" onclick="showSection('parametres')">Ouvrir les paramètres</button>
          </div>
        </div>
      `
      return
    }

    const budget = readCurrentBudgetForCouple()
    const goals = filterUserFacingRecords(await GoalsService.listGoals().catch(() => []), (goal) => goal?.name)
    const debts = await readSyncedArray(storageKeys.debts, [])
    const sharedGoals = goals.filter((goal) => CoupleService.isLocalItemShared('goal', goal.id))
    const sharedDebts = debts.filter((debt, index) => CoupleService.isLocalItemShared('debt', debt.id || index))

    section.style.display = 'block'
    section.innerHTML = `
      <div class="couple-page">
        <div class="budget-block-header">
          <span class="budget-block-title">❤️ Couple</span>
          <span style="font-size:12px;color:var(--text2)">Couche collaborative locale</span>
        </div>
        <section class="couple-hero-card">
          <div>
            <span>Foyer</span>
            <h2>${escapeHtml(household.name || 'Foyer Nexora')}</h2>
            <p>Utilisateur actuel : ${escapeHtml(household.currentUser || 'Moi')} · Partenaire : ${escapeHtml(household.partnerName || household.partnerEmail || 'invitation en attente')}</p>
          </div>
          <div class="couple-code-box">${escapeHtml(household.invitationCode || '—')}</div>
        </section>

        <section class="couple-grid">
          <div class="couple-card">
            <span>Revenus communs</span>
            <strong>${formatEuro(budget.income)}</strong>
            <em>Utilisateur / foyer selon les revenus saisis</em>
          </div>
          <div class="couple-card">
            <span>Charges communes</span>
            <strong>${formatEuro(budget.expenses)}</strong>
            <em>Charges fixes + variables du mois</em>
          </div>
          <div class="couple-card">
            <span>Solde actuel commun</span>
            <strong class="${budget.remaining >= 0 ? 'positive' : 'negative'}">${formatEuro(budget.remaining)}</strong>
            <em>Vue foyer, sans fusion cloud</em>
          </div>
        </section>

        <section class="couple-card wide">
          <div class="couple-section-head">
            <div>
              <span>Objectifs communs</span>
              <strong>${sharedGoals.length ? `${sharedGoals.length} partagé(s)` : 'Aucun objectif partagé'}</strong>
            </div>
            <em class="share-badge">Partage explicite</em>
          </div>
          <div class="couple-list">
            ${goals.length ? goals.map((goal) => {
              const current = Number(goal.current) || 0
              const target = Number(goal.target) || 0
              const pct = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0
              return `<div class="couple-list-row">
                <div><strong>${escapeHtml(goal.icon || '🎯')} ${escapeHtml(goal.name || 'Objectif')}</strong><span>${formatEuro(current)} / ${formatEuro(target)} · ${pct}%</span></div>
                ${createShareToggle('goal', goal.id, CoupleService.isLocalItemShared('goal', goal.id) ? 'Partagé' : 'Privé')}
              </div>`
            }).join('') : '<div class="empty-state">Aucun objectif à partager.</div>'}
          </div>
        </section>

        <section class="couple-card wide">
          <div class="couple-section-head">
            <div>
              <span>Dettes communes</span>
              <strong>${sharedDebts.length ? `${sharedDebts.length} partagée(s)` : 'Aucune dette partagée'}</strong>
            </div>
            <em class="share-badge">Privé par défaut</em>
          </div>
          <div class="couple-list">
            ${debts.length ? debts.map((debt, index) => {
              const id = debt.id || index
              return `<div class="couple-list-row">
                <div><strong>💳 ${escapeHtml(debt.name || 'Dette')}</strong><span>${formatEuro(debt.remaining)} restants · ${formatEuro(debt.monthly)}/mois</span></div>
                ${createShareToggle('debt', id, CoupleService.isLocalItemShared('debt', id) ? 'Partagée' : 'Privée')}
              </div>`
            }).join('') : '<div class="empty-state">Aucune dette à partager.</div>'}
          </div>
        </section>

        <section class="couple-card wide">
          <div class="couple-section-head">
            <div>
              <span>Partage budget</span>
              <strong>Revenus et charges</strong>
            </div>
            <em class="share-badge">Local</em>
          </div>
          <div class="couple-list">
            ${createShareToggle('income', 'rev_ali', 'Revenu utilisateur')}
            ${createShareToggle('income', 'rev_megane', 'Revenu foyer')}
            ${createShareToggle('charge', 'loyer', 'Loyer')}
            ${createShareToggle('charge', 'courses', 'Courses')}
          </div>
        </section>
      </div>
    `

    section.querySelectorAll('[data-share-type][data-share-id]').forEach((input) => {
      input.addEventListener('change', async (event) => {
        CoupleService.toggleLocalShare(event.target.dataset.shareType, event.target.dataset.shareId, event.target.value === 'shared')
        showToast?.(event.target.value === 'shared' ? 'Élément partagé' : 'Élément privé')
        await renderCoupleSection()
      })
    })
  }

  return {
    renderCoupleSection: renderCoupleSectionInternal
  }
}
