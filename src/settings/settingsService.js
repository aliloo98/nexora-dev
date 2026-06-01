export const SettingsService = {
  RECURRING_INCOMES_KEY: 'nexora_recurring_incomes',
  BILL_SCHEDULES_KEY: 'nexora_bill_schedules',

  normalizeRecurringIncome(entry = {}) {
    const day = Math.max(1, Math.min(31, Number(entry.day || entry.payDay || entry.date) || 1))
    return {
      name: String(entry.name || entry.title || 'Revenu récurrent').trim(),
      amount: Number(entry.amount) || 0,
      day,
      frequency: ['monthly', 'weekly', 'biweekly', 'once'].includes(entry.frequency) ? entry.frequency : 'monthly'
    }
  },

  normalizeBillSchedule(entry = {}) {
    const day = Math.max(1, Math.min(31, Number(entry.day || entry.dueDay || entry.date) || 1))
    const priority = ['critique', 'importante', 'standard'].includes(entry.priority) ? entry.priority : 'standard'
    return {
      name: String(entry.name || entry.title || 'Charge planifiée').trim(),
      amount: Number(entry.amount) || 0,
      day,
      date: day,
      priority,
      linkedCharge: entry.linkedCharge || entry.categoryKey || entry.key || ''
    }
  },

  async loadRecurringIncomes() {
    try {
      const raw = localStorage.getItem(this.RECURRING_INCOMES_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.map((entry) => this.normalizeRecurringIncome(entry)) : []
    } catch (error) {
      console.warn('[SettingsService] failed to load recurring incomes', error)
      return []
    }
  },

  async saveRecurringIncomes(entries = []) {
    try {
      const normalized = Array.isArray(entries) ? entries.map((entry) => this.normalizeRecurringIncome(entry)) : []
      localStorage.setItem(this.RECURRING_INCOMES_KEY, JSON.stringify(normalized))
      return normalized
    } catch (error) {
      console.warn('[SettingsService] failed to save recurring incomes', error)
      return []
    }
  },

  async loadBillSchedules() {
    try {
      const raw = localStorage.getItem(this.BILL_SCHEDULES_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.map((entry) => this.normalizeBillSchedule(entry)) : []
    } catch (error) {
      console.warn('[SettingsService] failed to load bill schedules', error)
      return []
    }
  },

  async saveBillSchedules(entries = []) {
    try {
      const normalized = Array.isArray(entries) ? entries.map((entry) => this.normalizeBillSchedule(entry)) : []
      localStorage.setItem(this.BILL_SCHEDULES_KEY, JSON.stringify(normalized))
      return normalized
    } catch (error) {
      console.warn('[SettingsService] failed to save bill schedules', error)
      return []
    }
  }
}
