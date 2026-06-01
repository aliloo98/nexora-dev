export const SettingsService = {
  RECURRING_INCOMES_KEY: 'nexora_recurring_incomes',
  BILL_SCHEDULES_KEY: 'nexora_bill_schedules',

  async loadRecurringIncomes() {
    try {
      const raw = localStorage.getItem(this.RECURRING_INCOMES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (error) {
      console.warn('[SettingsService] failed to load recurring incomes', error)
      return []
    }
  },

  async saveRecurringIncomes(entries = []) {
    try {
      localStorage.setItem(this.RECURRING_INCOMES_KEY, JSON.stringify(entries))
      return entries
    } catch (error) {
      console.warn('[SettingsService] failed to save recurring incomes', error)
      return []
    }
  },

  async loadBillSchedules() {
    try {
      const raw = localStorage.getItem(this.BILL_SCHEDULES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (error) {
      console.warn('[SettingsService] failed to load bill schedules', error)
      return []
    }
  },

  async saveBillSchedules(entries = []) {
    try {
      localStorage.setItem(this.BILL_SCHEDULES_KEY, JSON.stringify(entries))
      return entries
    } catch (error) {
      console.warn('[SettingsService] failed to save bill schedules', error)
      return []
    }
  }
}
