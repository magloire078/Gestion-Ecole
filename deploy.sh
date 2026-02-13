# Script de Déploiement Simplifié
# Copiez-collez ces commandes une par une dans votre terminal

# ========================================
# ÉTAPE 1 : CONNEXION FIREBASE
# ========================================
echo "🔐 Connexion à Firebase..."
firebase login
# ➡️ Connectez-vous avec: magloire078@gmail.com

# ========================================
# ÉTAPE 2 : SÉLECTION DU PROJET
# ========================================
echo "📂 Sélection du projet..."
firebase use greecole

# ========================================
# ÉTAPE 3 : CONFIGURATION DES SECRETS
# ========================================
echo "🔑 Configuration des secrets..."

# Secret 1 : Clé API
firebase apphosting:secrets:set genius_pay_api_key_live
# ➡️ Coller: pk_live_votre_cle

# Secret 2 : Secret API
firebase apphosting:secrets:set genius_pay_api_secret_live
# ➡️ Coller: sk_live_votre_secret

# ========================================
# ÉTAPE 4 : VÉRIFICATION DES SECRETS
# ========================================
echo "✅ Vérification des secrets..."
firebase apphosting:secrets:list

# ========================================
# ÉTAPE 5 : DÉPLOIEMENT
# ========================================
echo "🚀 Déploiement de l'application..."
firebase deploy --only apphosting

# ========================================
# ÉTAPE 6 : VÉRIFICATION
# ========================================
echo "🔍 Vérification du déploiement..."
firebase apphosting:backends:list

echo "✅ Déploiement terminé !"
