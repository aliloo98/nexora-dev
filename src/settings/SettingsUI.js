import { SettingsService } from './settingsService.js'
import { CoupleService } from '../couple/coupleService.js'
import AuthContext from '../auth/authContext.js'
import { createActiveCoupleModeCard, createBillScheduleCard, createRecurringIncomeCard } from './settingsMarkup.js'

const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('fr-FR')} €`
}

const readInputValue = (event) => {
  const key = event.target.dataset.key
  if (key !== 'amount') return event.target.type === 'number' ? Number(event.target.value) : event.target.value
  const amount = SettingsService.parseAmountStrict(event.target.value)
  if (amount === null) {
    event.target.classList.add('input-error')
    window.showToast?.('Expression financière invalide : rien n’a été enregistré')
    return null
  }
  event.target.classList.remove('input-error')
  return amount
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
      ${list || '<div class="empty-state">Aucun revenu récurrent n’est encore défini.</div>'}
    </div>
    <button class="btn btn-gold" type="button" id="add-recurring-income-btn">Ajouter un revenu</button>
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
      const value = readInputValue(event)
      if (value === null) return
      incomes[index] = { ...incomes[index], [key]: value, updated_at: new Date().toISOString() }
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
      ${list || '<div class="empty-state">Aucune échéance n’est encore planifiée.</div>'}
    </div>
    <button class="btn btn-gold" type="button" id="add-bill-schedule-btn">Ajouter une échéance</button>
  `

  root.querySelector('#add-bill-schedule-btn')?.addEventListener('click', async () => {
    bills.push({ name: 'Loyer', amount: 0, day: 1, priority: 'standard' })
    await SettingsService.saveBillSchedules(bills)
    await renderBillScheduleSettings()
  })

  root.querySelectorAll('.bill-schedule-input').forEach((input) => {
    input.addEventListener('change', async (event) => {
      const index = Number(event.target.dataset.index)
      const key = event.target.dataset.key
      const value = readInputValue(event)
      if (value === null) return
      bills[index] = { ...bills[index], [key]: value, updated_at: new Date().toISOString() }
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
    const partnerLabel = localHousehold?.partnerName || localHousehold?.partnerEmail || status.details?.couple?.partnerEmail || 'invitation en attente'
    root.innerHTML = createActiveCoupleModeCard({ household: localHousehold, partnerLabel, invitationCode })

    root.querySelector('#copy-invite-code-btn')?.addEventListener('click', async () => {
      await navigator.clipboard?.writeText?.(invitationCode).catch(() => {})
      window.showToast('Code d’invitation copié')
    })
    root.querySelector('#open-couple-page-btn')?.addEventListener('click', () => {
      window.showSection?.('couple')
    })
    root.querySelector('#disable-couple-btn')?.addEventListener('click', async () => {
      const ok = window.confirm('Quitter le foyer ? Vos données privées resteront intactes.')
      if (!ok) return
      CoupleService.leaveLocalHousehold()
      await renderCoupleModeSettings()
      if (typeof window.updateCoupleNavigation === 'function') {
        await window.updateCoupleNavigation()
      }
      window.showToast('Mode couple désactivé')
    })
    root.querySelector('#dissolve-couple-btn')?.addEventListener('click', async () => {
      const ok = window.confirm('Dissoudre le foyer ? Les données privées resteront intactes.')
      if (!ok) return
      CoupleService.dissolveLocalHousehold()
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
        <strong>Mode couple</strong>
        <p>Active un foyer local pour coordonner un budget à deux sans fusionner les données automatiquement.</p>
      </div>
      <div class="couple-mode-actions">
        <input type="text" id="couple-household-name" class="budget-input" placeholder="Nom du foyer" aria-label="Nom du foyer" />
        <input type="email" id="couple-partner-email" class="budget-input" placeholder="Email du partenaire" aria-label="Email du partenaire" />
        <input type="text" id="couple-join-code" class="budget-input" placeholder="Code d’invitation reçu" aria-label="Code d’invitation reçu" />
        <button class="btn btn-gold" type="button" id="create-couple-btn">Activer le mode couple</button>
        <button class="btn btn-outline" type="button" id="join-household-btn">Rejoindre un foyer</button>
        <button class="btn btn-outline" type="button" disabled title="Aucun foyer actif">Quitter le foyer</button>
        <button class="btn btn-danger" type="button" disabled title="Aucun foyer actif">Dissoudre le foyer</button>
      </div>
    </div>
  `

  root.querySelector('#create-couple-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('couple-household-name')?.value?.trim() || 'Foyer Nexora'
    const email = document.getElementById('couple-partner-email')?.value?.trim()
    CoupleService.enableLocalCouple(email, { name })
    await renderCoupleModeSettings()
    if (typeof window.updateCoupleNavigation === 'function') {
      await window.updateCoupleNavigation()
    }
    window.showToast('Mode couple activé')
  })

  root.querySelector('#join-household-btn')?.addEventListener('click', async () => {
    const code = document.getElementById('couple-join-code')?.value?.trim()
    if (!code) {
      window.showToast('Entre un code d’invitation')
      return
    }
    CoupleService.joinLocalHousehold(code)
    await renderCoupleModeSettings()
    if (typeof window.updateCoupleNavigation === 'function') {
      await window.updateCoupleNavigation()
    }
    window.showToast('Foyer rejoint localement')
  })
}
