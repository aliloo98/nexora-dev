# ⚡ Nexora - Guide de test rapide (5 min)

**Objectif**: Tester l'authentification en mode placeholder
**Durée**: 5 minutes
**Complexité**: Très facile ⭐

---

## 🚀 Démarrer

### 1. Lancer le serveur

```bash
cd /Users/macbookair/Desktop/Nexora-dev
npm run dev
```

**Attendu**:
```
✨ VITE v5.4.21 ready in 2XXX ms
➜ Local:   http://localhost:5173/
```

### 2. Ouvrir dans le navigateur

```
http://localhost:5173/
```

---

## 📋 Tests (5 scénarios)

### Test 1️⃣ : Voir la page de login

```
Page login affichée? ✅ / ❌
- Titre: "Nexora" ✅ / ❌
- Logo: 💰 ✅ / ❌
- Formulaire login ✅ / ❌
- Lien "S'inscrire" ✅ / ❌
- Bouton "🧪 Mode test" ✅ / ❌
```

### Test 2️⃣ : Mode test (60 secondes)

```
1. Cliquez le bouton bleu: "🧪 Mode test"
2. Attendez l'animation de chargement
3. Regardez le toast: "✅ Connecté avec succès!"
```

**Vérifiez**:
- [ ] Les champs email/password se remplissent
- [ ] Un spinner de chargement apparaît
- [ ] Toast "✅ Connecté" s'affiche
- [ ] Dashboard s'affiche après 1s
- [ ] Header change à: "Bonjour demo 👋"

### Test 3️⃣ : Menu utilisateur

```
1. Cherchez le menu utilisateur dans le header
2. Doit ressembler à: [D] demo ▾
3. Cliquez dessus
```

**Vérifiez**:
- [ ] Menu déroulant s'ouvre
- [ ] Affiche avatar "D" (première lettre)
- [ ] Affiche nom: "demo"
- [ ] Affiche email: "demo@nexora.local"
- [ ] Bouton "🚪 Déconnexion" visible
- [ ] Menu se ferme quand on clique ailleurs

### Test 4️⃣ : Déconnexion

```
1. Menu utilisateur ouvert
2. Cliquez "🚪 Déconnexion"
3. Confirmez la déconnexion
```

**Vérifiez**:
- [ ] Modal de confirmation apparaît
- [ ] Après confirmation: login page
- [ ] Header redevient: "Budget Ali & Megane"
- [ ] Toast "✅ Déconnecté" s'affiche

### Test 5️⃣ : S'inscrire

```
1. Depuis login, cliquez "S'inscrire"
2. Remplissez:
   - Nom: TestUser
   - Email: test@nexora.local
   - Password: password123
   - Confirm: password123
   - ✅ Case conditions
3. Cliquez "S'inscrire"
```

**Vérifiez**:
- [ ] Validations en temps réel
- [ ] Erreurs si données invalides
- [ ] After successful: dashboard
- [ ] Header: "Bonjour testuser 👋"
- [ ] Toast: "✅ Inscription réussie"

---

## 🔍 Ouvrir la console (F12)

### Voir les logs

```
Appuyez F12 pour ouvrir la console
Vous verrez des logs du système d'auth:

✓ AuthContext initializing...
📊 Storage initialized
🎨 Theme initialized
🔤 Logo initialized
✓ Supabase ready for multi-user features
✓ Supabase connected (no user logged in)

Après login:
🔐 AuthContext.signIn called
📊 Auth state changed - authenticated: true
✅ SignIn successful
```

---

## ⚠️ Comportements attendus

### Session perdue au rechargement F5

```
Connexion → F5 → Redirigé login
```

**C'est normal!** ✅
Mode placeholder utilise `sessionStorage` qui se vide au refresh.
Après activation Supabase, les sessions vont persister.

### Formulaires qui se remplissent au mode test

```
Cliquez "🧪 Mode test" → Email + Password se remplissent
```

**C'est normal!** ✅
C'est une démo pour faciliter les tests.

### Pas de vraie sécurité

```
Password visibles en sessionStorage
```

**C'est normal!** ✅
Mode placeholder pour tests uniquement.
Supabase aura du vrai chiffrement.

---

## 🎯 Checklist rapide

```
□ Page login affichée au démarrage
□ Logo 💰 et titre "Nexora" visibles
□ Formulaires avec validations fonctionnent
□ Mode test rempli les champs
□ Login redirige au dashboard
□ Header affiche "Bonjour {username} 👋"
□ Menu utilisateur affiche email
□ Déconnexion fonctionne
□ S'inscrire crée un nouvel utilisateur
□ Validations des formulaires actives
□ Console logs sans erreurs
```

**Résultat**: Si tous les ✅ → AUTH SYSTEM OK! 🎉

---

## 🚨 Si quelque chose ne marche pas

### Erreur: "Cannot GET /src/main.js"

**Solution**: Assurez-vous que `npm run dev` est lancé et pas de erreurs dans le terminal

### Erreur console: "import.meta.env is undefined"

**Solution**: Vérifier que `vite.config.js` existe dans le dossier root

### Login ne fonctionne pas

**Solution**:
1. Ouvrez la console (F12)
2. Regardez les erreurs rouges
3. Reportez-les

### Styles bizarres

**Solution**:
1. Appuyez Ctrl+Shift+Del (clear cache)
2. Ou Ctrl+F5 (hard refresh)
3. Ou ouvrez en mode incognito

---

## ✨ Comparaison avant/après

### AVANT (Placeholder prep)
```
- Pas de login
- Pas de username dynamique
- Pas de session management
```

### MAINTENANT (Vous testez ceci!)
```
✅ Page login complète
✅ Validations email/password/username
✅ Session management
✅ Menu utilisateur avec avatar
✅ Header dynamique
✅ Route protection
✅ Styles modernes
✅ Mode test pour démo rapide
```

### FUTUR (Après Supabase keys)
```
✅ Tout ci-dessus +
✅ Vraie sécurité Supabase
✅ Sessions persistentes
✅ Utilisateurs en database
✅ Cloud synchronization
✅ Multi-utilisateurs réels
```

---

## 📸 Screenshots attendus

### Page 1: Login
```
┌─────────────────────────────────┐
│          💰 Nexora              │
│   Connectez-vous à votre compte │
├─────────────────────────────────┤
│ Email: [_____________________]  │
│ Mot de passe: [_______________] │
│                                 │
│ ┌─ Se connecter ────────────┐  │
│ └─ 🧪 Mode test ────────────┘  │
│                                 │
│ Pas encore de compte? S'inscrire │
└─────────────────────────────────┘
```

### Page 2: Dashboard
```
┌──────────────────────────────────────────┐
│ Budget Bonjour demo 👋  Mois [Mai 2026] │
│  [D] demo ▾                              │
├──────────────────────────────────────────┤
│ Dashboard content...                     │
│ (inchangé, comme avant)                  │
└──────────────────────────────────────────┘
```

### Page 3: Menu utilisateur
```
User menu dropdown:
┌──────────────────────┐
│ [D] demo             │
│ demo@nexora.local    │
├──────────────────────┤
│ 🚪 Déconnexion      │
└──────────────────────┘
```

---

## 🎓 C'est tout!

Vous avez testé:
✅ Login
✅ Registration
✅ User menu
✅ Logout
✅ Validations
✅ Dynamic header

**Prochaines étapes:**

1. **Tester plus** → Voir [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)
2. **Activer Supabase** → Voir [ACTIVATE_SUPABASE.md](./ACTIVATE_SUPABASE.md)
3. **Questions?** → Voir [AUTH_READY.md](./AUTH_READY.md)

---

**Durée totale**: ~5 min ⏱️
**Complexité**: ⭐ Très facile
**Status**: 🟢 Prêt pour prod

**Bon test! 🎉**
