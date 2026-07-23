# Nexora Implementation Rules v1

## Objectif

Ces règles garantissent que Nexora évolue sans perdre sa cohérence visuelle, fonctionnelle ou technique.

Chaque modification doit respecter ces principes.

---

# 1. La logique métier est prioritaire

Le design ne doit jamais modifier le fonctionnement métier.

Toute évolution visuelle doit conserver le comportement existant, sauf si une évolution fonctionnelle est explicitement demandée.

---

# 2. Une modification = un objectif

Chaque intervention doit répondre à un seul objectif clair.

Exemples :

- améliorer la lisibilité ;
- améliorer la hiérarchie ;
- corriger un bug ;
- ajouter une fonctionnalité.

Éviter les modifications multiples non liées.

---

# 3. Réutiliser avant de créer

Avant de créer un nouveau composant :

- vérifier si un composant existant peut être réutilisé ;
- conserver une interface cohérente entre les écrans.

---

# 4. Respecter le Design System

Toute nouvelle interface doit suivre :

- colors.md
- components.md
- ux-principles.md

Aucune exception sans justification.

---

# 5. Préserver les performances

Une amélioration visuelle ne doit pas dégrader les performances.

Éviter :

- les animations inutiles ;
- les re-rendus inutiles ;
- les effets graphiques coûteux.

---

# 6. Valider chaque évolution

Avant de considérer une tâche comme terminée :

- vérifier le comportement ;
- exécuter les tests existants ;
- s'assurer que le build fonctionne.

---

# 7. Documentation

Toute nouvelle règle de design ou de comportement doit être documentée dans le Design System.

La documentation évolue en même temps que le produit.

---

# Principe final

Chaque modification doit rendre Nexora :

- plus clair ;
- plus cohérent ;
- plus rapide à comprendre ;
- plus simple à maintenir.