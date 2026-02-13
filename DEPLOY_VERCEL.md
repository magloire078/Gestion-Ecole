# Déploiement Rapide sur Vercel (RECOMMANDÉ)

## ✅ Pourquoi Vercel ?

Vercel est créé par l'équipe de Next.js et offre :
- ✅ **Gratuit** pour les projets personnels
- ✅ **SSR et API Routes** fonctionnent automatiquement
- ✅ **Domaine personnalisé** gratuit avec SSL
- ✅ **Variables d'environnement** faciles à configurer
- ✅ **Déploiement en 2 minutes**

---

## 🚀 DÉPLOIEMENT EN 3 ÉTAPES

### Étape 1 : Créer un compte Vercel

1. Allez sur https://vercel.com
2. Cliquez sur **Sign Up**
3. Connectez-vous avec **GitHub** (recommandé) ou Google

### Étape 2 : Importer le projet

#### Option A : Via GitHub (RECOMMANDÉ)

1. Poussez votre code sur GitHub :
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. Sur Vercel :
   - Cliquez sur **Add New Project**
   - Sélectionnez votre repository **Gestion-Ecole**
   - Cliquez sur **Import**

#### Option B : Via Vercel CLI

```powershell
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel

# Suivre les instructions :
# - Set up and deploy? Yes
# - Which scope? Votre compte
# - Link to existing project? No
# - Project name? gestion-ecole
# - Directory? ./
# - Override settings? No
```

### Étape 3 : Configurer les variables d'environnement

Sur Vercel Dashboard :
1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez ces variables :

```
NEXT_PUBLIC_FIREBASE_API_KEY=VOTRE_CLE_API_FIREBASE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=VOTRE_DOMAINE_AUTH_FIREBASE
NEXT_PUBLIC_FIREBASE_PROJECT_ID=VOTRE_ID_PROJET_FIREBASE
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=VOTRE_BUCKET_STORAGE_FIREBASE
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=VOTRE_SENDER_ID_FIREBASE
NEXT_PUBLIC_FIREBASE_APP_ID=VOTRE_APP_ID_FIREBASE

GENIUS_PAY_API_KEY=VOTRE_CLE_API_GENIUS_PAY_LIVE
GENIUS_PAY_API_SECRET=VOTRE_SECRET_API_GENIUS_PAY_LIVE
GENIUS_PAY_API_URL=https://pay.genius.ci/api/v1/merchant
```

3. Cliquez sur **Save**
4. Redéployez (Vercel le fait automatiquement)

---

## 🌐 Domaine Personnalisé

### Ajouter www.gereecole.com

1. Sur Vercel Dashboard → **Settings** → **Domains**
2. Cliquez sur **Add**
3. Entrez : `www.gereecole.com`
4. Suivez les instructions pour configurer les DNS

**Configuration DNS** :
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

⏱️ Propagation : 5-30 minutes

---

## ⚡ Commandes Rapides

### Déploiement via CLI

```powershell
# Installation
npm install -g vercel

# Premier déploiement
vercel

# Déploiements suivants
vercel --prod
```

### Logs en temps réel

```powershell
vercel logs
```

---

## 📊 Après Déploiement

Votre application sera accessible sur :
- `https://gestion-ecole-xxx.vercel.app` (URL temporaire)
- `https://www.gereecole.com` (après configuration DNS)

### Configuration Post-Déploiement

1. **Webhooks Genius Pay** :
   - URL : `https://www.gereecole.com/api/webhooks/genius`

2. **Mettre à jour NEXT_PUBLIC_BASE_URL** :
   - Dans Vercel → Environment Variables
   - `NEXT_PUBLIC_BASE_URL=https://www.gereecole.com`
   - Redéployer

3. **Créer compte admin** :
   - Firebase Console → Firestore → `users` → [votre UID]
   - Ajouter : `isAdmin: true`

---

## 🎯 Avantages vs Firebase

| Fonctionnalité | Vercel | Firebase Hosting |
|----------------|--------|------------------|
| Next.js SSR | ✅ Natif | ❌ Nécessite Cloud Run |
| API Routes | ✅ Automatique | ❌ Nécessite Cloud Functions |
| Déploiement | ✅ 1 commande | ⚠️ Configuration complexe |
| Variables env | ✅ Interface simple | ⚠️ Secrets manager |
| Domaine SSL | ✅ Gratuit | ✅ Gratuit |
| Prix | ✅ Gratuit | ✅ Gratuit (limites) |

---

## ✅ Checklist

- [ ] Compte Vercel créé
- [ ] Projet importé/déployé
- [ ] Variables d'environnement configurées
- [ ] Application accessible
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Webhooks mis à jour
- [ ] Compte admin créé
- [ ] Tests effectués

---

## 🆘 Support

- **Documentation** : https://vercel.com/docs
- **Support** : https://vercel.com/support

---

## ⏱️ Temps Total

- Création compte : 2 min
- Import projet : 1 min
- Configuration variables : 3 min
- Premier déploiement : 2-5 min
- **Total : ~10 minutes**

---

Prêt à déployer sur Vercel ?
