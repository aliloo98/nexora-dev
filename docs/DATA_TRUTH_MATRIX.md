# Nexora V6.4 — Matrice des sources de vérité

> **Règle produit :** une donnée = un service officiel. Les autres chemins sont **miroirs legacy** ou **ponts de compatibilité** — ne pas les étendre.

| Donnée | Source officielle | Clé / table | Miroirs (lecture fallback) | Pont legacy (ne pas étendre) |
|--------|-------------------|-------------|----------------------------|------------------------------|
| Budget mensuel (montants, payé, notes) | `MonthlyBudgetStateService` | `budget_{userId}_{YYYY-MM}` → Supabase `monthly_budget_states` | `SafeStorage`, `localStorage` | `TransactionsService` + `syncMonthTransactionsToSupabase` |
| Objectifs | `UserAppSettingsService` | `nexora_goals_v1` → `user_app_settings` | `SafeStorage` / IDB namespacé | — |
| Dettes | `UserAppSettingsService` | `nexora_debts_v1` → `user_app_settings` | `SafeStorage` (via `readDebts` / bridge) | `localStorage` direct dans anciens modules |
| Réglages IA | `UserAppSettingsService` | `nexora_ai_settings_v1` | `SafeStorage` (coach local) | — |
| Mémoire Nexora | `UserAppSettingsService` | `nexora_financial_memory_v1` | `SafeStorage` | — |
| Revenus récurrents | `UserAppSettingsService` | `nexora_recurring_incomes` | `SafeStorage` | — |
| Charges planifiées | `UserAppSettingsService` | `nexora_bill_schedules` | `SafeStorage` | — |
| Cycle budgétaire | `UserAppSettingsService` | `nexora_budget_cycle_settings_v1` | `SafeStorage` | — |
| Historique snapshots | `UserAppSettingsService` | `nexora_monthly_history_snapshots_v1` | `SafeStorage` | — |
| Notifications (réglages + historique) | `NotificationsService` → `StorageManager` | `nexora_notifications_*` | `SafeStorage` | — |
| Thème / logo | `ThemeManager` / `LogoManager` | `budget_app_theme`, logo keys | `localStorage` | Non synchronisé cloud |
| Foyer couple (UI actuelle) | `CoupleService` local | `nexora_couple_household` | — | Supabase `couples` (infra prête, UI locale) |
| Session utilisateur | `AuthContext` / Supabase Auth | session JWT | `nexora_auth_*` local | — |

## Doublons identifiés (V6.4)

1. **Budget :** `MonthlyBudgetStateService` **et** `TransactionsService` écrivent tous deux après `saveData`.
2. **Dettes :** `index.html` (SafeStorage + UAS) vs `PlanHubUI` (localStorage seul) → **corrigé V6.4** via `syncedSettingAccess`.
3. **Stockage :** `StorageManager` (IDB) + `SafeStorage` + `localStorage` + clés non namespacées miroir dans `userAppSettingsService`.
4. **Réglages IA :** `proactiveCoachService.readJson` + `UserAppSettingsService` (écriture double volontaire, lecture UAS prioritaire au save).

## Actions V6.4 (sans suppression brutale)

- Budget : conserver `TransactionsService` comme pont ; commentaire explicite dans `saveData`.
- Dettes / récurrents / objectifs : **toujours** passer par `UserAppSettingsService` pour l’écriture cloud.
- Activer logs sync temporaires : `localStorage.nexora_sync_debug_v1 = '1'`.
