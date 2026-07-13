import { parseFinancialExpression } from '../finance/financialExpression.js'
import { UserAppSettingsService } from '../../js/userAppSettingsService.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  normalizeRecurringIncome as normalizeRecurringIncomeRecord,
  normalizeRecurringIncomeList
} from './recurringIncomeSync.js'

const nowIso = () => new Date().toISOString()
const makeId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const parseStrictAmount = (value) => {
  const parsed = parseFinancialExpression(value, { fallback: null })
  return parsed === null ? null : parsed
}

export const SettingsService = {
  RECURRING_INCOMES_KEY: 'nexora_recurring_incomes',
  BILL_SCHEDULES_KEY: 'nexora_bill_schedules',

  normalizeRecurringIncome(entry = {}) {
    return normalizeRecurringIncomeRecord(entry, { parseAmount: parseStrictAmount })
  },

  normalizeBillSchedule(entry = {}) {
    const day = Math.max(1, Math.min(31, Number(entry.day || entry.dueDay || entry.date) || 1))
    const priority = ['critique', 'importante', 'standard'].includes(entry.priority) ? entry.priority : 'standard'
    const amount = parseStrictAmount(entry.amount)
    return {
      id: entry.id || makeId('bill'),
      name: String(entry.name || entry.title || 'Charge planifiée').trim(),
      amount: amount === null ? 0 : amount,
      day,
      date: day,
      priority,
      linkedCharge: entry.linkedCharge || entry.categoryKey || entry.key || '',
      updated_at: entry.updated_at || entry.updatedAt || nowIso()
    }
  },

  parseAmountStrict(value) {
    return parseStrictAmount(value)
  },

  async loadRecurringIncomes() {
    try {
      const { value } = await UserAppSettingsService.getSetting(STORAGE_KEYS.recurringIncomes)
      const storageKey = UserAppSettingsService.getLocalStorageKey(this.RECURRING_INCOMES_KEY)
      const raw = value === null ? localStorage.getItem(storageKey) : null
      const parsed = value !== null ? value : (raw ? JSON.parse(raw) : [])
      return normalizeRecurringIncomeList(
        Array.isArray(parsed) ? parsed : [],
        { parseAmount: parseStrictAmount }
      )
    } catch (error) {
      console.warn('[SettingsService] failed to load recurring incomes', error)
      return []
    }
  },

  async saveRecurringIncomes(entries = []) {
    try {
      const normalized = Array.isArray(entries) ? entries.map((entry) => this.normalizeRecurringIncome({ ...entry, updated_at: entry.updated_at || nowIso() })) : []
      await UserAppSettingsService.saveSetting(STORAGE_KEYS.recurringIncomes, normalized)
      await UserAppSettingsService.syncLocalSettingToCloud(STORAGE_KEYS.recurringIncomes).catch((err) => {
        console.warn('[SettingsService] recurring incomes cloud sync failed', err)
      })
      return normalized
    } catch (error) {
      console.warn('[SettingsService] failed to save recurring incomes', error)
      return []
    }
  },

  async loadBillSchedules() {
    try {
      const { value } = await UserAppSettingsService.getSetting(STORAGE_KEYS.billSchedules)
      const storageKey = UserAppSettingsService.getLocalStorageKey(this.BILL_SCHEDULES_KEY)
      const raw = value === null ? localStorage.getItem(storageKey) : null
      const parsed = value !== null ? value : (raw ? JSON.parse(raw) : [])
      return Array.isArray(parsed) ? parsed.map((entry) => this.normalizeBillSchedule(entry)) : []
    } catch (error) {
      console.warn('[SettingsService] failed to load bill schedules', error)
      return []
    }
  },

  async saveBillSchedules(entries = []) {
    try {
      const normalized = Array.isArray(entries) ? entries.map((entry) => this.normalizeBillSchedule({ ...entry, updated_at: entry.updated_at || nowIso() })) : []
      await UserAppSettingsService.saveSetting(STORAGE_KEYS.billSchedules, normalized)
      await UserAppSettingsService.syncLocalSettingToCloud(STORAGE_KEYS.billSchedules).catch((err) => {
        console.warn('[SettingsService] bill schedules cloud sync failed', err)
      })
      return normalized
    } catch (error) {
      console.warn('[SettingsService] failed to save bill schedules', error)
      return []
    }
  }
}
