# Protocole de validation synchronisation — Nexora V6.4

## Prérequis

- Même compte Supabase sur **téléphone** (PWA installée) et **PC** (navigateur).
- Connexion Internet active sur les deux appareils.
- Optionnel : `localStorage.setItem('nexora_sync_debug_v1', '1')` puis recharger pour voir `[NexoraSync]` dans la console.
- Consulter le journal : `JSON.parse(localStorage.getItem('nexora_sync_log_v1')||'[]')`

## Procédure (ordre recommandé)

| # | Action | Appareil A | Appareil B | Critère de succès |
|---|--------|------------|------------|-------------------|
| 1 | Dette créée | Téléphone : ajouter une dette test « Sync Phone » | PC : recharger l’app (F5) | Dette visible, montants identiques |
| 2 | Dette créée | PC : ajouter « Sync PC » | Téléphone : recharger PWA | Dette visible |
| 3 | Objectif | Téléphone : créer objectif « Sync Goal » | PC : onglet Objectifs / dashboard | Objectif présent |
| 4 | Récurrent | PC : Paramètres → revenu récurrent « Sync Income » | Téléphone : Plan / budget | Montant pris en compte |
| 5 | Mémoire Nexora | Téléphone : déclencher conseil Nexora (page Nexora) | PC : même page | `lastRecommendation` cohérent après refresh |
| 6 | Réglages IA | PC : changer niveau de prudence → enregistrer | Téléphone : Paramètres IA | Même sélection |

## Après chaque étape

1. Attendre 2–5 s (sync cloud asynchrone).
2. Sur l’appareil B : **rechargement complet** (pas seulement changement d’onglet).
3. Noter : OK / KO + horodatage dans `docs/SYNC_TRUST_REPORT.md`.

## En cas d’échec

- Vérifier session : utilisateur connecté (`AuthContext.isAuthenticated()`).
- Vérifier `nexora_sync_log_v1` pour `action: cloud-to-local` ou `local-to-cloud`.
- Forcer pull : dans la console, `await UserAppSettingsService.syncCloudSettingToLocal('nexora_debts_v1')` (adapter la clé).

## Rapport de confiance

Remplir `docs/SYNC_TRUST_REPORT.md` après la campagne de tests.
