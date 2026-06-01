# Version Finale Nexora

## Fonctionnalites finales

- Budget mensuel avec categories dynamiques.
- Saisie mobile first des revenus, charges fixes et depenses variables.
- Objectifs premium avec projection, rythme recommande et etat d'avancement.
- Module Dettes avec montant restant, mensualite, fin estimee et taux d'endettement.
- Assistant Nexora avec analyse budget, objectifs, dettes et recommandations simples.
- Notifications V3+ en boite de reception avec filtres, lecture, archivage et restauration.
- Historique intelligent avec meilleur mois, pire mois, moyennes et tendances.
- PDF Premium final avec resume executif, dettes, objectifs, cycle et pagination.
- Mode simplifie centre sur argent entrant, argent sortant, argent restant et objectif principal.
- PWA offline pour usage quotidien sans reseau.
- Supabase conserve pour synchronisation lorsque disponible.

## Limites connues

- Le mode couple complet n'est pas active en production.
- Les notifications iPhone dependent de la PWA installee et des autorisations systeme.
- Le PDF reste un rendu interne maison, sans moteur typographique externe.
- Les dettes sont gerees localement et ne modelisent pas encore les interets composes.
- L'audit visuel Playwright local reste limite par le probleme Chromium SIGTRAP deja documente.

## Idees futures

- Mode couple complet avec invitation partenaire.
- Partage selectif des donnees.
- Budget foyer distinct du budget personnel.
- Assistant hebdomadaire plus proactif.
- Scenarios avances de remboursement de dettes.
- Import bancaire plus guide.

## Roadmap V4

- Construire le mode couple seulement apres observation terrain.
- Prioriser la confiance, le consentement et la clarte des donnees partagees.
- Garder Nexora utilisable sans reseau et comprehensible en moins de 5 secondes.
