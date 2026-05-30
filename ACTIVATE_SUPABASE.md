# 🚀 Guide d'activation Supabase - Nexora

**Objectif**: Activer les vraies clés Supabase et passer en mode production
**Durée**: ~15 minutes
**Complexité**: Facile ⭐

---

## ⏳ Avant de commencer

Vous devez avoir:
- [ ] Projet Supabase créé (https://supabase.com)
- [ ] Accès au Supabase Dashboard
- [ ] Clés API obtenues

---

## 📝 Étape 1 : Obtenir les clés Supabase

### 1.1 Allez sur Supabase Dashboard

1. Connectez-vous à https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**

### 1.2 Trouvez vos clés

```
Project URL:        https://xxxxxxxxxxxxx.supabase.co
Anon Public Key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Secret Key:         sbp_xxxxxxxxxxxxx... (⚠️ NE PAS UTILISER)
```

**Important**:
- ✅ **Copier**: `Project URL` et `Anon Public Key`
- ❌ **NE PAS utiliser**: `Secret Key` (c'est secret!)

---

## 🔧 Étape 2 : Configurer .env

### 2.1 Ouvrir le fichier `.env`

```bash
# Terminal:
nano /Users/macbookair/Desktop/Nexora-dev/.env
```

### 2.2 Remplacer les placeholders

```env
# AVANT (placeholder):
VITE_SUPABASE_URL=https://fwzwqzrgffkvsbzwjdmv.supabase.co
VITE_SUPABASE_ANON_KEY=MA_PUBLISHABLE_KEY

# APRÈS (vos vraies clés):
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.3 Sauvegarder

```bash
# Ctrl+O puis Enter, puis Ctrl+X (nano)
```

---

## 💻 Étape 3 : Modifier authService.js

### 3.1 Ouvrir `src/auth/authService.js`

### 3.2 Dans la fonction `signUp()` :

**AVANT**:
```javascript
async signUp(email, password, username) {
  try {
    // TODO: Real Supabase implementation (uncomment when ready)
    // const { data, error } = await supabase.auth.signUp({...

    // PLACEHOLDER: Simulate successful signup
    console.log('🔐 [PLACEHOLDER] SignUp attempted:', { email, username })
    // ... código placeholder ...
```

**APRÈS**:
```javascript
async signUp(email, password, username) {
  try {
    // Real Supabase implementation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    })

    if (error) throw error

    // Create user profile in users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            username: username,
            created_at: new Date()
          }
        ])

      if (profileError) throw profileError
    }

    return { user: data.user, error: null }
```

### 3.3 Supprimer le code placeholder

```javascript
    // ❌ SUPPRIMER:
    // console.log('🔐 [PLACEHOLDER] SignUp attempted:', { email, username })
    // await new Promise(resolve => setTimeout(resolve, 800))
    // const mockUser = { id: 'user_' + ... }
```

---

## 📝 Étape 4 : Activer signIn()

### 4.1 Trouver la fonction `signIn()` dans authService.js

**AVANT**:
```javascript
async signIn(email, password) {
  try {
    // TODO: Real Supabase implementation (uncomment when ready)
    // const { data, error } = await supabase.auth.signInWithPassword({...

    // PLACEHOLDER: Simulate successful login
    console.log('🔐 [PLACEHOLDER] SignIn attempted:', { email })
    // ... código placeholder ...
```

**APRÈS**:
```javascript
async signIn(email, password) {
  try {
    // Real Supabase implementation
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    return {
      user: data.user,
      session: data.session,
      error: null
    }
```

### 4.2 Supprimer le code placeholder

---

## 🚪 Étape 5 : Activer signOut()

### 5.1 Trouver `signOut()` dans authService.js

**AVANT**:
```javascript
async signOut() {
  try {
    // TODO: Real Supabase implementation (uncomment when ready)
    // const { error } = await supabase.auth.signOut()

    // PLACEHOLDER: Simulate successful logout
    console.log('🔐 [PLACEHOLDER] SignOut initiated')
```

**APRÈS**:
```javascript
async signOut() {
  try {
    // Real Supabase implementation
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
```

---

## 👤 Étape 6 : Activer getCurrentUser()

### 6.1 Trouver `getCurrentUser()` dans authService.js

**AVANT**:
```javascript
async getCurrentUser() {
  try {
    // TODO: Real Supabase implementation (uncomment when ready)
    // const { data: { user }, error } = await supabase.auth.getUser()

    // PLACEHOLDER: Simulate retrieving current user from session storage
    console.log('🔐 [PLACEHOLDER] getCurrentUser called')
```

**APRÈS**:
```javascript
async getCurrentUser() {
  try {
    // Real Supabase implementation
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return { user, error: null }
```

---

## 🔄 Étape 7 : Setup Auth State Listener

### 7.1 À la fin de authService.js

**DÉCOMMENTER**:
```javascript
/**
 * Supabase Listener Setup
 */
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('✅ User signed in:', session.user)
  }
  if (event === 'SIGNED_OUT') {
    console.log('❌ User signed out')
  }
})
```

---

## 🗄️ Étape 8 : Créer les tables Supabase (optionnel maintenant)

### Pour plus tard (quand vous voudrez la synchronisation cloud):

```sql
-- Créer table users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL UNIQUE,
  username VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Créer table budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  revenues DECIMAL DEFAULT 0,
  fixed_charges DECIMAL DEFAULT 0,
  variable_expenses DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Créer table transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  amount DECIMAL NOT NULL,
  description VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Activer RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies pour sécurité
CREATE POLICY "Users can only see their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

---

## ✅ Étape 9 : Tester

### 9.1 Redémarrer le serveur dev

```bash
# Terminal, arrêtez le serveur (Ctrl+C)
npm run dev

# Le serveur redémarre et charge les nouvelles variables .env
```

### 9.2 Tester la registration

1. Allez à http://localhost:5173
2. Cliquez sur "S'inscrire"
3. Remplissez le formulaire:
   ```
   Nom: Test User
   Email: test@example.com
   Password: password123
   ```
4. Cliquez "S'inscrire"

**Attendu**:
- ✅ Redirection au dashboard
- ✅ Header affiche "Bonjour Test User 👋"
- ✅ Données dans Supabase Console

### 9.3 Tester la connexion

1. Cliquez le menu utilisateur (avatar)
2. Cliquez "Déconnexion"
3. Reconnectez-vous avec les mêmes identifiants

**Attendu**:
- ✅ Login fonctionne
- ✅ Session restaurée au rechargement F5

### 9.4 Vérifier Supabase Console

1. Allez à https://app.supabase.com
2. Allez dans **Auth** → **Users**
3. Vous devriez voir votre nouvel utilisateur

---

## 🔍 Dépannage

### "Supabase Auth API not available"

**Cause**: Variables `.env` mal copiées
**Solution**: Vérifier exactement vos clés Supabase

### "Email already registered"

**Cause**: Vous utilisez un email déjà enregistré
**Solution**: Utiliser un autre email pour tester

### "Project not initializing"

**Cause**: Votre projet Supabase est en pause
**Solution**: Allez dans Supabase Settings et activez le projet

### "Access denied: insufficient permissions"

**Cause**: Vos RLS policies ne sont pas correctes
**Solution**: Ajouter les policies de sécurité (Étape 8)

---

## ⏮️ Revenir au mode placeholder (si besoin)

### 9.1 Restaurer les commentaires dans authService.js

Simplement recommenter le code Supabase et décommenter le code placeholder

### 9.2 La transition est réversible!

- Placeholder → Production: Facile ✅
- Production → Placeholder: Aussi facile ✅

---

## 📊 Checklist de vérification

- [ ] `.env` a les vraies clés Supabase
- [ ] `authService.js` a le code Supabase décommenté
- [ ] Code placeholder supprimé
- [ ] Serveur redémarré (`npm run dev`)
- [ ] Registration fonctionne
- [ ] Login fonctionne
- [ ] Utilisateurs visibles dans Supabase Console
- [ ] Logout fonctionne
- [ ] Session restaurée après F5

---

## 🎓 Résumé de la migration

| Étape | Quoi | Temps |
|-------|------|-------|
| 1 | Obtenir clés Supabase | 2 min |
| 2 | Configurer `.env` | 2 min |
| 3-7 | Modifier authService.js | 5 min |
| 8 | Créer tables (optionnel) | 3 min |
| 9 | Tester | 3 min |
| **TOTAL** | | **~15 min** |

---

## ✨ Résultat final

```
AVANT:
  🧪 Mode test avec données fictives
  Session perdue au rechargement F5
  Pas de vraie sécurité

APRÈS:
  ✅ Vraie authentification Supabase
  ✅ Sessions persistentes (encryption)
  ✅ Utilisateurs dans database
  ✅ Prêt pour production
  ✅ Zéro changement au dashboard
```

---

**Questions?** Voir [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)

**Généré**: 28 mai 2026
**Version**: Nexora 1.0.0
**Status**: ✅ Prêt pour activation
