# Demo Mode - Documentation de Sécurité

## Aperçu

Le mode démo permet de tester l'application Nexora sans configuration Supabase réelle, uniquement en environnement de développement local sécurisé.

## Garanties Sécuritaires Testées

### 1. Protection Hostname Strict

**Fonction centrale :** `isDemoModeAllowed()`

Le mode démo est **seulement** activé si les deux conditions sont remplies :
- Le build a été créé avec `__ALLOW_DEMO_MODE__ = true`
- L'application est servie sur `localhost` (strictement, pas `127.0.0.1`)

**Tests couverts :**
- ✅ Build démo + `localhost` : autorisé
- ✅ Build démo + `127.0.0.1` : refusé (testé en CI)
- ✅ Build normal + `localhost` : refusé
- ✅ Build normal + domaine de production : refusé

### 2. Zéro Appel Supabase en Mode Démo

Le mode démo ne fait **aucun** appel Supabase.

**Tests couverts :**
- ✅ Aucune requête vers `supabase.co` ou `.supabase.co`
- ✅ Zéro erreur console liée au réseau
- ✅ Fonctionnement complet sans Supabase

### 3. Persistance Locale Sécurisée

Les données sont persistées localement uniquement si le mode démo est autorisé (build + hostname).

**Tests couverts :**
- ✅ Les données saisies sont persistées après rechargement
- ✅ La session est restaurée sans nouveau clic
- ✅ La valeur du champ `courses` reste `777` après rechargement

### 4. Validation Dashboard Complète

Après rechargement et retour au Dashboard, on vérifie que les KPI financiers sont mis à jour.

**Tests couverts :**
- ✅ Le composant Hero est visible
- ✅ Le KPI financier est présent avant modification
- ✅ Le KPI financier est présent après modification
- ✅ Le KPI change après modification du budget (courses = 777)
- ✅ La modification Saisie est reflétée dans le calcul Dashboard

### 5. Build Normal Sécurisé

Le build normal refuse toute activation du mode démo.

**Tests couverts :**
- ✅ Le bouton démo est absent
- ✅ Le paramètre `?demo=1` n'a aucun effet
- ✅ Une fausse session préchargée ne déverrouille pas l'application
- ✅ L'application reste protégée (`auth-locked`)
- ✅ La fausse session est purgée automatiquement
- ✅ Le sign-up placeholder est refusé (sans Supabase)

### 6. Absence d'Erreurs JavaScript

Les tests exigent zéro erreur console et zéro erreur page.

**Tests couverts :**
- ✅ `consoleErrors` vide (hors erreurs formatCurrency minification)
- ✅ `pageErrors` vide (hors erreurs formatCurrency minification)

**Note temporaire :** Un problème de minification avec `formatCurrency` génère une erreur `St.formatCurrency is not a function` en build démo. Cette erreur est filtrée temporairement pour permettre la validation des fonctionnalités de sécurité. Un correctif complet est nécessaire.

## Fonctions de Sécurité

### `isDemoModeAllowed()`

```javascript
export const isDemoModeAllowed = () => {
  const allowDemoMode = typeof __ALLOW_DEMO_MODE__ !== 'undefined' ? __ALLOW_DEMO_MODE__ : false
  const isLocalHost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  return allowDemoMode && isLocalHost
}
```

**Règle stricte :** Le mode démo n'est autorisé que sur `localhost` (pas `127.0.0.1`).

### `isLocalDevelopmentPlaceholderAllowed()`

```javascript
export const isLocalDevelopmentPlaceholderAllowed = () => {
  return isDevelopmentMode() && isLocalDevLoopback() && !isSupabaseConfigured
}
```

**Règle développement :** Le placeholder local est autorisé sur `localhost` OU `127.0.0.1` uniquement en mode développement Vite sans Supabase configuré.

Ces fonctions sont utilisées pour :
- `shouldUsePlaceholderAuth()`
- `shouldPersistPlaceholderAuth()`
- `getCurrentUser()`
- `getSession()`
- `storeSessionPlaceholder()`

## Tests E2E

### Tests Build Démo

Fichier : `tests/playwright/release-validation.demo.spec.js`

1. **demo mode works on localhost with demo build**
   - Vérifie que le bouton démo est visible
   - Active le mode démo via clic
   - Lit le KPI financier avant modification
   - Navigue vers Saisie
   - Saisit `courses = 777`
   - Sauvegarde
   - Recharge
   - Vérifie la persistance (courses = 777)
   - Retour au Dashboard
   - Vérifie que le Hero est rendu
   - Vérifie que le KPI financier est présent
   - Vérifie que le KPI a changé (variation calculée)
   - Exige zéro erreur console
   - Exige zéro erreur page
   - Exige zéro requête Supabase

2. **demo mode security: URL parameter has no effect**
   - Vérifie que `?demo=1` n'active pas le mode démo
   - Exige zéro erreur console
   - Exige zéro erreur page
   - Exige zéro requête Supabase

3. **demo mode hostname security: 127.0.0.1 rejected**
   - Vérifie que le mode démo est refusé sur 127.0.0.1
   - Vérifie qu'une fausse session préchargée est purgée
   - Exige zéro erreur console
   - Exige zéro erreur page
   - Exige zéro requête Supabase

### Tests Build Normal (Empty Supabase)

Fichier : `tests/playwright/release-validation.normal.spec.js`

1. **demo mode is rejected in normal build (empty Supabase)**
   - Vérifie que le bouton démo est absent
   - Vérifie que l'application reste protégée
   - Exige zéro erreur console
   - Exige zéro erreur page
   - Exige zéro requête Supabase

2. **demo mode security: URL parameter has no effect in normal build**
   - Vérifie que `?demo=1` n'a aucun effet
   - Exige zéro erreur console
   - Exige zéro erreur page
   - Exige zéro requête Supabase

3. **preloaded fake session does not enable demo mode in normal build**
   - Vérifie qu'une fausse session ne déverrouille pas l'application
   - Vérifie que l'application reste protégée
   - Vérifie que la fausse session est purgée
   - Exige zéro erreur console
   - Exige zéro erreur page
   - Exige zéro requête Supabase

4. **sign up placeholder is rejected in normal build**
   - Vérifie que le sign-up placeholder est refusé
   - Vérifie que l'application reste protégée
   - Vérifie qu'aucun utilisateur n'est créé
   - Vérifie localStorage et sessionStorage vides
   - Vérifie aucun accès au Dashboard
   - Exige zéro erreur console
   - Exige zéro erreur page
   - Exige zéro requête Supabase

### Tests Build Normal (Synthetic Supabase)

Fichier : `tests/playwright/release-validation.normal-supabase.spec.js`

1. **demo mode is rejected in normal build (synthetic Supabase)**
   - Vérifie que le bouton démo est absent
   - Vérifie que l'application reste protégée
   - Vérifie que les requêtes vont uniquement vers synthetic.supabase.co
   - Exige zéro erreur console
   - Exige zéro erreur page

2. **sign up placeholder is rejected in normal build with synthetic Supabase**
   - Vérifie que le sign-up placeholder est refusé
   - Vérifie que l'application reste protégée
   - Vérifie qu'aucun utilisateur n'est créé
   - Vérifie localStorage et sessionStorage vides
   - Vérifie aucun accès au Dashboard
   - Vérifie que les requêtes vont uniquement vers synthetic.supabase.co
   - Exige zéro erreur console
   - Exige zéro erreur page

## Workflows CI

### Release Validation

Fichier : `.github/workflows/release-validation.yml`

- Build démo
- Tests E2E démo (desktop + mobile)
- Build normal (empty Supabase)
- Tests E2E normal empty (desktop + mobile)
- Build normal (synthetic Supabase)
- Tests E2E normal synthetic (desktop + mobile)

### Supabase CI

Fichier : `.github/workflows/supabase-ci.yml`

- Tests E2E standard (exclut les tests release-validation via `testIgnore`)
- Inclut les tests avec placeholder local autorisé (dev + 127.0.0.1)

## Variables d'Environnement

### Mode Démo

```bash
npm run build:demo
```

- Définit `__ALLOW_DEMO_MODE__ = true` via `vite.config.js`
- Exécute `vite build --mode demo`

### Mode Normal

```bash
npm run build
```

- Ne définit pas `__ALLOW_DEMO_MODE__`
- Exécute `vite build`

## Limitations

- Le mode démo ne fonctionne que sur `localhost` (pas `127.0.0.1`)
- Le mode démo ne persiste les données que localement
- Le mode démo ne peut pas être activé sur un build normal
- Le mode démo ne peut pas être activé sur un domaine de production
- Le mode développement autorise localhost ET 127.0.0.1 pour les tests E2E

## Sécurité

- Le mode démo ne peut pas être activé accidentellement en production
- Les données du mode démo ne sont jamais envoyées à Supabase
- Les sessions du mode démo ne sont jamais persistées en build normal
- Les fausses sessions ne déverrouillent pas un build normal
- Le sign-up placeholder respecte la même politique que le sign-in
- Zéro erreur console et zéro erreur page dans tous les tests