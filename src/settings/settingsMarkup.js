import { escapeHtml } from '../utils/htmlEscape.js'

export const createRecurringIncomeCard = (income, index) => {
  const name = escapeHtml(income.name || 'Revenu récurrent')
  const amount = escapeHtml(income.amount || 0)
  return `
    <div class="settings-card recurring-income-row" data-index="${index}">
      <div style="display:grid;gap:10px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <strong>${name}</strong>
          <button class="btn btn-outline remove-income-btn" type="button" data-index="${index}">Supprimer</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
          <input type="text" class="budget-input recurring-income-input" data-index="${index}" data-key="name" value="${escapeHtml(income.name || '')}" placeholder="Nom du revenu" aria-label="Nom du revenu" />
          <input type="text" class="budget-input recurring-income-input" data-index="${index}" data-key="amount" value="${amount}" placeholder="Montant" aria-label="Montant du revenu" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <select class="budget-input recurring-income-input" data-index="${index}" data-key="frequency" aria-label="Fréquence de revenu">
            <option value="monthly" ${income.frequency === 'monthly' ? 'selected' : ''}>Mensuel</option>
            <option value="weekly" ${income.frequency === 'weekly' ? 'selected' : ''}>Hebdomadaire</option>
            <option value="biweekly" ${income.frequency === 'biweekly' ? 'selected' : ''}>Bi-hebdo</option>
            <option value="once" ${income.frequency === 'once' ? 'selected' : ''}>Unique</option>
          </select>
          <input type="number" class="budget-input recurring-income-input" data-index="${index}" data-key="day" value="${escapeHtml(income.day || 1)}" min="1" max="31" placeholder="Jour" aria-label="Jour de revenu" />
        </div>
      </div>
    </div>
  `
}

export const createBillScheduleCard = (bill, index) => {
  const name = escapeHtml(bill.name || 'Charge planifiée')
  const amount = escapeHtml(bill.amount || 0)
  return `
    <div class="settings-card bill-schedule-row" data-index="${index}">
      <div style="display:grid;gap:10px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <strong>${name}</strong>
          <button class="btn btn-outline remove-bill-btn" type="button" data-index="${index}">Supprimer</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
          <input type="text" class="budget-input bill-schedule-input" data-index="${index}" data-key="name" value="${escapeHtml(bill.name || '')}" placeholder="Nom de la charge" aria-label="Nom de la charge" />
          <input type="text" class="budget-input bill-schedule-input" data-index="${index}" data-key="amount" value="${amount}" placeholder="Montant" aria-label="Montant de la charge" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <input type="number" class="budget-input bill-schedule-input" data-index="${index}" data-key="day" value="${escapeHtml(bill.day || bill.date || '')}" min="1" max="31" placeholder="Jour du mois" aria-label="Jour de facturation" />
          <select class="budget-input bill-schedule-input" data-index="${index}" data-key="priority" aria-label="Priorité de la charge">
            <option value="standard" ${bill.priority === 'standard' ? 'selected' : ''}>Standard</option>
            <option value="importante" ${bill.priority === 'importante' ? 'selected' : ''}>Importante</option>
            <option value="critique" ${bill.priority === 'critique' ? 'selected' : ''}>Critique</option>
          </select>
        </div>
      </div>
    </div>
  `
}

export const createActiveCoupleModeCard = ({ household = {}, partnerLabel = '', invitationCode = 'NEXORA' } = {}) => `
  <div class="settings-card couple-mode-card is-active">
    <div class="couple-mode-head">
      <div>
        <strong>${escapeHtml(household.name || 'Foyer Nexora')}</strong>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">Mode couple actif en local. Les données privées restent privées tant qu’elles ne sont pas marquées partagées.</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">Partenaire : ${escapeHtml(partnerLabel || 'invitation en attente')}</div>
      </div>
      <span class="plan-status-pill success">Actif local</span>
    </div>
    <div class="couple-code-box">${escapeHtml(invitationCode)}</div>
    <div class="couple-mode-actions">
      <button class="btn btn-outline" type="button" id="copy-invite-code-btn">Copier le code</button>
      <button class="btn btn-gold" type="button" id="open-couple-page-btn">Ouvrir Couple</button>
      <button class="btn btn-outline" type="button" id="disable-couple-btn">Quitter le foyer</button>
      <button class="btn btn-danger" type="button" id="dissolve-couple-btn">Dissoudre le foyer</button>
    </div>
  </div>
`
