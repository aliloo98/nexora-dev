import { SettingsService } from './settingsService.js'
import { CoupleService } from '../couple/coupleService.js'
import AuthContext from '../auth/authContext.js'

const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('fr-FR')} €`
}

const createRecurringIncomeCard = (income, index) => {
  return `
    <div class="settings-card recurring-income-row" data-index="${index}">
      <div style="display:grid;gap:10px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <strong>${income.name || 'Revenu récurrent'}</strong>
          <button class="btn btn-outline remove-income-btn" type="button" data-index="${index}">Supprimer</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
          <input type="text" class="budget-input recurring-income-input" data-index="${index}" data-key="name" value="${income.name || ''}" placeholder="Nom du revenu" aria-label="Nom du revenu" />
          <input type="number" class="budget-input recurring-income-input" data-index="${index}" data-key="amount" value="${income.amount || 0}" placeholder="Montant" aria-label="Montant du revenu" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <select class="budget-input recurring-income-input" data-index="${index}" data-key="frequency" aria-label="Fréquence de revenu">
            <option value="monthly" ${income.frequency === 'monthly' ? 'selected' : ''}>Mensuel</option>
            <option value="weekly" ${income.frequency === 'weekly' ? 'selected' : ''}>Hebdomadaire</option>
            <option value="biweekly" ${income.frequency === 'biweekly' ? 'selected' : ''}>Bi-hebdo</option>
            <option value="once" ${income.frequency === 'once' ? 'selected' : ''}>Unique</option>
          </select>
          <input type="number" class="budget-input recurring-income-input" data-index="${index}" data-key="day" value="${income.day || 1}" min="1" max="31" placeholder="Jour" aria-label="Jour de revenu" />
        </div>
      </div>
    </div>
  `
}

const createBillScheduleCard = (bill, index) => {
  return `
    <div class="settings-card bill-schedule-row" data-index="${index}">
      <div style="display:grid;gap:10px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <strong>${bill.name || 'Charge planifiée'}</strong>
          <button class="btn btn-outline remove-bill-btn" type="button" data-index="${index}">Supprimer</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
          <input type="text" class="budget-input bill-schedule-input" data-index="${index}" data-key="name" value="${bill.name || ''}" placeholder="Nom de la charge" aria-label="Nom de la charge" />
          <input type="number" class="budget-input bill-schedule-input" data-index="${index}" data-key="amount" value="${bill.amount || 0}" placeholder="Montant" aria-label="Montant de la charge" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <input type="number" class="budget-input bill-schedule-input" data-index="${index}" data-key="date" value="${bill.date || ''}" min="1" max="31" placeholder="Jour du mois" aria-label="Jour de facturation" />
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

export async function renderSettingsPanels() {
  await renderRecurringIncomeSettings()
  await renderBillScheduleSettings()
  await renderCoupleModeSettings()
}

export async function renderRecurringIncomeSettings() {
  const root = document.getElementById('recurring-incomes-root')
  if (!root) return

  const incomes = await SettingsService.loadRecurringIncomes()
  const list = incomes.map((income, index) => createRecurringIncomeCard(income, index)).join('')

  root.innerHTML = `
    <div class="settings-panel">
      ${list || '<div class="empty-state">Aucun revenu récurrent enregistré.</div>'}
    </div>
    <button class="btn btn-gold" type="button" id="add-recurring-income-btn">Ajouter un revenu récurrent</button>
  `

  root.querySelector('#add-recurring-income-btn')?.addEventListener('click', async () => {
    incomes.push({ name: 'Salaire', amount: 0, frequency: 'monthly', day: 1 })
    await SettingsService.saveRecurringIncomes(incomes)
    await renderRecurringIncomeSettings()
  })

  root.querySelectorAll('.recurring-income-input').forEach((input) => {
    input.addEventListener('change', async (event) => {
      const index = Number(event.target.dataset.index)
      const key = event.target.dataset.key
      const value = event.target.type === 'number' ? Number(event.target.value) : event.target.value
      incomes[index] = { ...incomes[index], [key]: value }
      await SettingsService.saveRecurringIncomes(incomes)
    })
  })

  root.querySelectorAll('.remove-income-btn').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const index = Number(event.target.dataset.index)
      incomes.splice(index, 1)
      await SettingsService.saveRecurringIncomes(incomes)
      await renderRecurringIncomeSettings()
    })
  })
}

export async function renderBillScheduleSettings() {
  const root = document.getElementById('bill-schedule-root')
  if (!root) return

  const bills = await SettingsService.loadBillSchedules()
  const list = bills.map((bill, index) => createBillScheduleCard(bill, index)).join('')

  root.innerHTML = `
    <div class="settings-panel">
      ${list || '<div class="empty-state">Aucune échéance définie pour le moment.</div>'}
    </div>
    <button class="btn btn-gold" type="button" id="add-bill-schedule-btn">Ajouter une échéance</button>
  `

  root.querySelector('#add-bill-schedule-btn')?.addEventListener('click', async () => {
    bills.push({ name: 'Loyer', amount: 0, date: 1, priority: 'standard' })
    await SettingsService.saveBillSchedules(bills)
    await renderBillScheduleSettings()
  })

  root.querySelectorAll('.bill-schedule-input').forEach((input) => {
    input.addEventListener('change', async (event) => {
      const index = Number(event.target.dataset.index)
      const key = event.target.dataset.key
      const value = event.target.type === 'number' ? Number(event.target.value) : event.target.value
      bills[index] = { ...bills[index], [key]: value }
      await SettingsService.saveBillSchedules(bills)
    })
  })

  root.querySelectorAll('.remove-bill-btn').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const index = Number(event.target.dataset.index)
      bills.splice(index, 1)
      await SettingsService.saveBillSchedules(bills)
      await renderBillScheduleSettings()
    })
  })
}

export async function renderCoupleModeSettings() {
  const root = document.getElementById('couple-mode-settings-root')
  if (!root) return

  const status = await CoupleService.getCombinedStatus(AuthContext.getState()?.user)
  const localHousehold = CoupleService.getLocalHousehold()
  const active = status.status === 'couple_actif'

  if (active) {
    const invitationCode = localHousehold?.invitationCode || 'NEXORA'
    root.innerHTML = `
      <div class="settings-card couple-mode-card is-active">
        <div class="couple-mode-head">
          <div>
            <strong>Mode couple activé</strong>
            <div style="font-size:12px;color:var(--text2);margin-top:4px">Partenaire : ${localHousehold?.partnerEmail || status.details?.couple?.partnerEmail || 'inconnu'}</div>
          </div>
          <span class="plan-status-pill success">Actif</span>
        </div>
        <div class="couple-code-box">${invitationCode}</div>
        <div class="couple-mode-actions">
          <button class="btn btn-outline" type="button" id="invite-partner-btn">Invite partner</button>
          <button class="btn btn-outline" type="button" id="join-household-btn" disabled>Join household</button>
          <button class="btn btn-outline" type="button" id="disable-couple-btn">Leave household</button>
          <button class="btn btn-danger" type="button" id="dissolve-couple-btn">Dissolve household</button>
        </div>
      </div>
    `

    root.querySelector('#invite-partner-btn')?.addEventListener('click', () => {
      window.showToast(`Code invitation : ${invitationCode}`)
    })
    root.querySelector('#join-household-btn')?.addEventListener('click', () => {
      window.showToast('Foyer déjà actif')
    })
    root.querySelector('#disable-couple-btn')?.addEventListener('click', async () => {
      CoupleService.disableLocalCouple()
      await renderCoupleModeSettings()
      if (typeof window.updateCoupleNavigation === 'function') {
        await window.updateCoupleNavigation()
      }
      window.showToast('Mode couple désactivé')
    })
    root.querySelector('#dissolve-couple-btn')?.addEventListener('click', async () => {
      CoupleService.disableLocalCouple()
      await renderCoupleModeSettings()
      if (typeof window.updateCoupleNavigation === 'function') {
        await window.updateCoupleNavigation()
      }
      window.showToast('Foyer dissous localement')
    })
    return
  }

  root.innerHTML = `
    <div class="settings-card couple-mode-card">
      <div class="couple-premium-empty">
        <strong>Premium empty state</strong>
        <p>Active Couple Mode pour créer un foyer partagé, inviter un partenaire et gérer le budget à deux.</p>
      </div>
      <div class="couple-mode-actions">
        <input type="email" id="couple-partner-email" class="budget-input" placeholder="Email du partenaire" aria-label="Email du partenaire" />
        <button class="btn btn-gold" type="button" id="create-couple-btn">Activate</button>
        <button class="btn btn-outline" type="button" disabled title="Activez Couple Mode pour inviter un partenaire">Invite partner</button>
        <button class="btn btn-outline" type="button" disabled title="Invitation partenaire requise">Join household</button>
        <button class="btn btn-outline" type="button" disabled title="Aucun foyer actif">Leave household</button>
        <button class="btn btn-danger" type="button" disabled title="Aucun foyer actif">Dissolve household</button>
      </div>
    </div>
  `

  root.querySelector('#create-couple-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('couple-partner-email')?.value?.trim()
    if (!email) {
      window.showToast('Entre un email de partenaire valide')
      return
    }
    CoupleService.enableLocalCouple(email)
    await renderCoupleModeSettings()
    if (typeof window.updateCoupleNavigation === 'function') {
      await window.updateCoupleNavigation()
    }
    window.showToast('Mode couple activé localement')
  })
}
