# Rapport de Refactoring - Split Init App

## Résumé

Refactoring de la fonction `initApp` dans `src/main.js` en modules bootstrap spécialisés pour améliorer la maintenabilité et la clarté de l'orchestration de démarrage.

## Modifications

### Nouveaux fichiers créés
- `src/bootstrap/appBootstrap.js` - Orchestrateur principal
- `src/bootstrap/preAuthBootstrap.js` - Initialisation pré-authentification
- `src/bootstrap/authenticatedBootstrap.js` - Services authentifiés
- `src/bootstrap/userDataBootstrap.js` - Synchronisation des données utilisateur
- `src/bootstrap/applicationUiBootstrap.js` - Rendu de l'UI
- `src/ui/amountInputHandlers.js` - Gestion des inputs de montant

### Fichiers modifiés
- `src/main.js` - Extraction de la logique vers les modules bootstrap
- `src/auth/authStartupOrder-tests.js` - Renforcement des tests d'ordre de démarrage
- `src/couple/coupleController.js` - Refactoring pour utiliser createCoupleState avec callback
- `src/couple/coupleState.js` - Refactoring pour exporter createCoupleState avec callback
- `src/couple/coupleNavigation.js` - Suppression de syncLegacyGlobal
- `src/couple/coupleSectionRenderer.js` - Refactoring pour utiliser createCoupleSectionRenderer

## Métriques

### windowAssignments

La cause exacte de la différence 106 → 103 n'a pas été établie.

Aucun global legacy audité n'a disparu et aucune suppression de window assignment n'a été démontrée dans le périmètre de ce refactoring.

La baseline n'a pas été modifiée.

Cette différence fera l'objet d'une investigation séparée.

### Tests

Le test `src/auth/authStartupOrder-tests.js` a été renforcé pour vérifier l'ordre réel des phases importantes:
- bootstrapPreAuth avant bootstrapAuthenticatedServices
- waitForAuthenticatedState avant NotificationsService et MonthlyBudgetStateService
- Premier updateCoupleNavigation après l'UI legacy
- Deuxième updateCoupleNavigation avant renderCoupleSection
- syncInitialGoals avant GoalsPage
- syncUserApplicationSettings avant attachAmountInputHandlers
- attachAmountInputHandlers avant les rendus avancés finaux

Le test échoue si ces phases sont inversées.

## Validation

- Build réussi
- Tests unitaires réussis
- Tests E2E réussis
- Architecture baseline vérifiée
- Aucun warning critique
