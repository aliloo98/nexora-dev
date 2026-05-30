const STORAGE_KEYS = {
  goals: 'nexora_goals_v1',
  budgetCycleSettings: 'nexora_budget_cycle_settings_v1',
  monthlyHistorySnapshots: 'nexora_monthly_history_snapshots_v1',
  csvLearning: 'nexora_csv_learning_v1',
  csvImportDrafts: 'nexora_csv_import_drafts_v1',
  notificationsSettings: 'nexora_notifications_settings_v1',
  notificationsHistory: 'nexora_notifications_history_v1',
  monthlyBudgetStatesMeta: 'nexora_monthly_budget_states_meta_v1',
  budgetMonthPrefix: 'budget_',
  cagnottes: 'budget_cagnottes',
  appTheme: 'budget_app_theme'
}

const SYNCED_APP_SETTING_KEYS = [
  STORAGE_KEYS.goals,
  STORAGE_KEYS.monthlyHistorySnapshots,
  STORAGE_KEYS.budgetCycleSettings,
  STORAGE_KEYS.csvLearning,
  STORAGE_KEYS.csvImportDrafts
]

export { STORAGE_KEYS, SYNCED_APP_SETTING_KEYS }
