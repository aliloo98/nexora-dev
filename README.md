# 🚀 Guide d'Installation & Utilisation

## Installation

Aucune installation requise ! L'application est une **Progressive Web App (PWA)** complète.

### Sur Desktop
1. Ouvrez `index.html` dans votre navigateur
2. Vous verrez l'interface de gestion budgétaire complète

### Sur Mobile (Installation PWA)
1. Ouvrez la page dans Chrome/Edge/Firefox mobile
2. Appuyez sur le menu **⋮** (3 points)
3. Sélectionnez **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**
4. L'app sera installée comme une application native

## ✨ Nouvelles Fonctionnalités

### 🎨 Système de Logo Avancé (16 emojis)
Accédez à **Paramètres → Personnalisation → Logo de l'application**

**Emojis disponibles :**
```
💰 👑 💖 🚀 💍 🏠 🐼 🍸 ✨ 🎯 🌟 💎 🎨 🔥 🌈 🦄
```

**Options :**
- **Sélection rapide** : Cliquez sur un emoji
- **Emoji personnalisé** : Entrez n'importe quel emoji
- **Image personnalisée** : Uploadez un logo (PNG, JPG)
- **Réinitialiser** : Retour au logo par défaut (💰)

### 🌈 Système de Thème (5 couleurs)
Accédez à **Paramètres → Personnalisation → Thème de l'application**

**Thèmes disponibles :**
1. 🟡 **Or Royal** (défaut) - Chaleureux et sophistiqué
2. 🟢 **Émeraude Cyber** - Frais et moderne
3. 🟣 **Améthyste Rêve** - Élégant avec une touche mystérieuse
4. 🔴 **Rubis Feu** - Énergique et passionnel
5. 🔵 **Bleu Océan** - Calme et profond

Le thème s'applique instantanément et se sauvegarde automatiquement.

## 🔒 Sécurité des Données

### Stockage Local
- **IndexedDB** : Première priorité (chiffrement natif)
- **LocalStorage** : Fallback si IndexedDB non disponible
- Les données restent 100% sur votre appareil

### Sauvegarde
1. Paramètres → Sauvegarde & transfert
2. **Exporter** : Télécharge un fichier JSON
3. **Importer** : Restaure depuis un fichier JSON

## 📱 Fonctionnalités Principales

### Tableau de Bord (🏠)
- **KPIs en temps réel** : Revenus, charges, épargne
- **Donut chart** : Répartition visuelle
- **Règle 50/30/20** : Analyse de santé financière
- **Simulateur** : Scénarios virtuels "Et si ?"
- **Projets d'épargne** : Cagnottes avec progression

### Saisie du Mois (✏️)
- Revenus (Ali, Mégane, exceptionnels)
- Charges fixes (loyer, assurances, etc.)
- Dépenses variables (courses, loisirs, etc.)
- **Tracking des paiements** : Cochez quand c'est payé
- **Notes** : Ajoutez des détails pour chaque ligne
- **Formules mathématiques** : Entrez `100+50-30` instead de faire le calcul

### Historique (📊)
- Graphique d'évolution mensuelle
- Cartes historiques des 12 derniers mois
- Cliquez sur un mois pour le charger

### Paramètres (⚙️)
- **Personnalisation** : Logo & thème
- **Objectives** : Montant d'épargne cible
- **Sauvegarde** : Export/Import JSON
- **Importation CSV** : Automatisez votre saisie
- **Réinitialisation** : Effacer un mois

## 💾 Mode Hors Ligne

L'application fonctionne **complètement hors ligne** :
- Service Worker en cache
- Tous les calculs locaux
- Données persistantes

La synchronisation cloud reste optionnelle.

## 📊 Formules Intelligentes

Vous pouvez entrer des formules simples dans les champs montant :
```
150 + 50         → 200
100 - 25         → 75
50 * 2           → 100
100 / 2          → 50
(100 + 50) * 2   → 300
```

Appuyez sur **Entrée** pour valider.

## 🎯 Astuces Pro

1. **Sauvegarder régulièrement** : Cliquez sur "💾 Sauvegarder" en bas à droite
2. **Notes sur les imprévus** : Utilisez les emojis "💬" pour documenter
3. **Comparaison mois/mois** : L'historique montre automatiquement les tendances
4. **Budget visuel** : Les barres de progression montrent la santé globale
5. **Export backup** : Faites un export JSON chaque mois pour la sécurité

## 🐛 Dépannage

### Les données ne se sauvegardent pas
→ Vérifiez que localStorage est activé (Confidentialité du navigateur)

### Le logo n'apparaît pas
→ Forcez le rechargement (Ctrl+Shift+R ou Cmd+Shift+R)

### IndexedDB ne fonctionne pas
→ L'app utilise automatiquement localStorage comme fallback

### Service Worker ne s'active pas
→ Ouvrez les DevTools (F12) → Application → Service Workers

## 📞 Support

Application v2.0 (27 mai 2026)
Créée pour Ali & Mégane ❤️

---

**Amusez-vous et gérez bien votre budget ! 💰**

Auto deploy verification
