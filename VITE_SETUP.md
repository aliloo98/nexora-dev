# Nexora - Migration Vite & Supabase Setup

## Résumé des modifications (28 mai 2026)

### ✅ Transformations réalisées

#### 1. **Conversion en projet Vite**
   - Créé `package.json` avec Vite 5.0 et @supabase/supabase-js 2.39.0
   - Créé `vite.config.js` avec configuration optimale
   - Transformé tous les JS en modules ES6 (exports)

#### 2. **Intégration Supabase**
   - ✅ `src/supabase.js` : Client Supabase + fonction de test de connexion
   - ✅ Variables d'env via `import.meta.env.VITE_*`
   - ✅ Seule la publishable key (anon) est utilisée - sécurisé ✓

#### 3. **Architecture modulaire**
   - `js/storage.js` → export StorageManager
   - `js/utils.js` → export Utils, ConfettiEngine  
   - `js/theme-manager.js` → export ThemeManager
   - `js/logo-manager.js` → export LogoManager
   - `src/main.js` → Point d'entrée Vite (importe et expose globalement)

#### 4. **Fichiers de configuration**
   - `.env` : Credentials Supabase
   - `.env.example` : Template pour nouveaux devs
   - `.gitignore` : Sécurité des secrets

#### 5. **HTML adapté pour Vite**
   - Supprimé anciens script tags
   - Ajouté `<script type="module" src="/src/main.js"></script>`
   - Le bundling Vite remplace les imports

---

## 📊 Fichiers créés/modifiés

### Créés ✨
```
package.json                 - Dépendances + scripts
vite.config.js              - Configuration Vite
src/
├── main.js                 - Point d'entrée (initialisation app)
├── supabase.js            - Client Supabase
.env                       - Variables Supabase (NE PAS COMMITTER)
.env.example               - Template .env
.gitignore                 - Ignore des secrets
VITE_SETUP.md             - Ce fichier
```

### Modifiés 📝
```
js/storage.js              + export { StorageManager }
js/utils.js                + export { Utils, ConfettiEngine }
js/theme-manager.js        + export { ThemeManager }
js/logo-manager.js         + export { LogoManager }
index.html                 - Anciens scripts, + Vite module script
```

### Inchangés ✓
```
styles.css, manifest.json, sw.js, favicon.png, icons
Toute la logique CSS & HTML du dashboard
Système localStorage/IndexedDB
Système de thèmes
Système de logos
CSV import/export
```

---

## 🚀 Démarrage du projet

### Installation (première fois)
```bash
cd /Users/macbookair/Desktop/Nexora-dev
npm install
```

### Développement
```bash
npm run dev
# Ouvre http://localhost:5173
```

### Build production
```bash
npm run build
# Génère dist/ avec bundling optimisé
```

### Preview production
```bash
npm run preview
```

---

## ☁️ Tests Supabase

### Console (F12)
Vous devriez voir au chargement :
```
📊 Storage initialized
🎨 Theme initialized
🔤 Logo initialized
✓ Supabase connected (no user logged in - expected)
☁️ Supabase ready for multi-user features
✅ Nexora initialized successfully
```

### Code test (src/supabase.js)
```javascript
import { testSupabaseConnection } from './src/supabase.js'
await testSupabaseConnection() // Returns true/false
```

---

## 🔐 Configuration Supabase

### Variables d'environnement (.env)
```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_publishable_key_ici
```

⚠️ **IMPORTANT**
- JAMAIS committer `.env`
- JAMAIS utiliser VITE_SUPABASE_SECRET_KEY (c'est public!)
- Utiliser UNIQUEMENT VITE_SUPABASE_ANON_KEY
- `.gitignore` le protège déjà

---

## 🔄 Architecture globale

```
Navigateur
    ↓
index.html
    ↓
<script type="module" src="/src/main.js"></script>  [Vite injecte]
    ↓
src/main.js (entry point)
    ├→ imports js/* (modules ES6)
    ├→ Expose globalement (window.*) pour compatibilité
    ├→ imports src/supabase.js
    └→ initApp()
        ├→ StorageManager.initIndexedDB()
        ├→ ThemeManager.init()
        ├→ LogoManager.init()
        └→ testSupabaseConnection()
```

---

## 📋 Prochaines étapes (Roadmap SaaS)

### Phase 1️⃣ : Authentication
- [ ] Implémenter Supabase Auth (email/password)
- [ ] Ajouter formulaire login/signup
- [ ] Persister session user
- [ ] Middleware: rediriger non-auth vers login

### Phase 2️⃣ : Multi-utilisateur
- [ ] Créer table `users` dans Supabase
- [ ] Lier transactions/données à user_id
- [ ] Afficher username dynamique (header)
- [ ] Logout button

### Phase 3️⃣ : Cloud Sync
- [ ] Créer table `budgets` & `transactions`
- [ ] Implémenter sauvegarde cloud (vs localStorage)
- [ ] Sync bidirectionnel
- [ ] Offline-first avec sync au reconnect

### Phase 4️⃣ : Collaboration (futur)
- [ ] Partage de budget avec autre utilisateur
- [ ] Permissions (lecture/écriture)
- [ ] Notifications temps réel (Realtime Supabase)

### Phase 5️⃣ : Features avancées
- [ ] Import CSV intelligent (user-specific)
- [ ] Backup auto
- [ ] Historique versions
- [ ] Analytics Supabase

---

## 🐛 Dépannage

### "import.meta.env is undefined"
→ Vérifier que `vite.config.js` existe ✓

### "Cannot find module '@supabase/supabase-js'"
→ Faire `npm install` à jour

### "Supabase connection failed"
→ Vérifier `.env` et URLs dans Supabase dashboard

### Erreurs localStorage ancien code
→ Garder StorageManager exposé globalement (déjà fait ✓)

---

## 📚 Ressources

- **Vite**: https://vitejs.dev
- **Supabase Docs**: https://supabase.com/docs
- **Supabase JS Client**: https://supabase.com/docs/reference/javascript
- **ES Modules**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

---

**Généré**: 28 mai 2026  
**Version**: Nexora 1.0.0 (Vite + Supabase Ready)  
**Status**: ✅ Production-ready (auth pending)
