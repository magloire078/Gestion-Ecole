# Guide de Déploiement - Gestion-Ecole (LWS & Firebase App Hosting)

Ce guide vous accompagne pour mettre en ligne l'application sur `www.gereecole.com` et configurer l'environnement de production.

## 1. Prérequis
- Accès au panneau de gestion **LWS** (pour le domaine).
- Accès à la console **Firebase**.
- Code à jour poussé sur GitHub.

## 2. Configuration Firebase App Hosting
Puisque vous avez déjà un fichier `apphosting.yaml`, le déploiement est simplifié.

1. Allez dans la console Firebase > **App Hosting**.
2. Cliquez sur **Commencer** ou **Créer un backend**.
3. Connectez votre compte GitHub et sélectionnez le dépôt `Gestion-Ecole`.
4. Suivez les étapes. App Hosting détectera automatiquement `apphosting.yaml`.
5. **Variables d'environnement** :
   Dans les paramètres du backend App Hosting, ajoutez vos clés API (Stripe, Genius Pay, Firebase config) :
   - `GENIUS_PAY_CLIENT_ID`
   - `GENIUS_PAY_CLIENT_SECRET`
   - `NEXT_PUBLIC_BASE_URL` (ex: `https://www.gereecole.com`)

## 3. Configuration du Domaine (LWS)

Une fois le backend créé dans Firebase, vous devez lier votre domaine.

1. Dans Firebase App Hosting, allez dans l'onglet **Paramètres** ou **Domaines**.
2. Cliquez sur **Ajouter un domaine personnalisé**.
3. Entrez `www.gereecole.com`.
4. Firebase vous donnera des enregistrements DNS à configurer (généralement des enregistrements A ou CNAME).

### Sur LWS :
1. Connectez-vous à votre espace client LWS.
2. Allez dans la gestion de domaine pour `gereecole.com`.
3. Cliquez sur **Gestion de la zone DNS**.
4. **Supprimez** les enregistrements existants ou par défaut qui pourraient entrer en conflit (ex: redirection par défaut LWS).
5. **Ajoutez** les enregistrements fournis par Firebase :
   - **Type** : A (ou CNAME selon instruction Firebase)
   - **Nom** : `www`
   - **Valeur/Cible** : (L'adresse IP ou le domaine fourni par Firebase)
   - **TTL** : Laissez par défaut (ex: 3600).

> [!NOTE]
> La propagation DNS peut prendre de quelques minutes à 24h.

## 4. Initialisation des Données (Seeding)

Une fois le site en ligne (ou en local pour tester) :

1. Faites une requête POST vers `/api/seed` pour générer les données de démo.
   - Outil recommandé : Postman, curl, ou simplement via un petit script temporaire.
   - Exemple curl : `curl -X POST https://www.gereecole.com/api/seed`

## 5. Intégration Genius Pay

Assurez-vous d'avoir ajouté les variables d'environnement dans Firebase App Hosting :
```bash
GENIUS_PAY_CLIENT_ID=...
GENIUS_PAY_CLIENT_SECRET=...
GENIUS_PAY_API_URL=https://api.genius.ci/v1 (Vérifiez la documentation officielle pour l'URL exacte)
```

## Support
Si le déploiement échoue, consultez les logs dans l'onglet "Logs" de Cloud Run (accessible via Firebase App Hosting).
