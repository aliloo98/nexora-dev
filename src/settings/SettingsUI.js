import { SettingsService } from './settingsService.js'
// V1 scope reduction: Couple mode is out of scope for V1
// import { CoupleService } from '../couple/coupleService.js'
import AuthContext from '../auth/authContext.js'
import { createActiveCoupleModeCard, createBillScheduleCard, createRecurringIncomeCard } from './settingsMarkup.js'
import { customConfirm, showToast } from '../../js/utils.js'
import { OnboardingService } from '../onboarding/onboardingService.js'

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
    showToast('Expression financière invalide : rien n’a été enregistré')
    return null
  }
  event.target.classList.remove('input-error')
  return amount
}

export async function renderSettingsPanels() {
  await renderRecurringIncomeSettings()
  await renderBillScheduleSettings()
  await renderCoupleModeSettings()
  await renderOnboardingSettings()
}

export async function renderOnboardingSettings() {
  const root = document.getElementById('onboarding-settings-root')
  if (!root) return

  const state = await OnboardingService.getState()
  const progress = await OnboardingService.getProgress()

  root.innerHTML = `
    <div class="settings-card onboarding-settings-card">
      <div class="onboarding-settings-header">
        <strong>Onboarding Nexora</strong>
        <p>Guide de prise en main de l'application</p>
      </div>
      <div class="onboarding-settings-status">
        <div class="onboarding-settings-progress">
          <span class="onboarding-settings-progress-text">${progress.completed}/${progress.total} étapes complétées</span>
          <span class="onboarding-settings-progress-percentage">${progress.percentage}%</span>
        </div>
        <div class="onboarding-settings-progress-bar">
          <div class="onboarding-settings-progress-fill" style="width: ${progress.percentage}%"></div>
        </div>
      </div>
      <div class="onboarding-settings-actions">
        <button class="btn btn-gold" type="button" id="reset-onboarding-btn">Relancer l'onboarding</button>
      </div>
    </div>
  `

  root.querySelector('#reset-onboarding-btn')?.addEventListener('click', async () => {
    customConfirm(
      'Relancer l’onboarding',
      'Voulez-vous relancer l’onboarding ? Cela réinitialisera votre progression.',
      async () => {
        await OnboardingService.reset()
        await renderOnboardingSettings()
        showToast('Onboarding relancé')
      }
    )
  })
}

export async function renderRecurringIncomeSettings() {
  const root = document.getElementById('recurring-incomes-root')
  if (!root) return

  const incomes = await SettingsService.loadRecurringIncomes()
  const list = incomes.map((income, index) => createRecurringIncomeCard(income, index)).join('')

  root.innerHTML = `
    <div class="settings-panel">
      ${list || '<div class="empty-state">Aucun revenu récurrent n’est encore saisi.</div>'}
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
  // V1 scope reduction: Couple mode is out of scope for V1
  // Feature implementation is preserved for future restoration
  const root = document.getElementById('couple-mode-settings-root')
  if (!root) return

  // Render empty state for V1 - Couple is completely hidden
  root.innerHTML = ''
}
