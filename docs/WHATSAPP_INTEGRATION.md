# Intégration WhatsApp (Evolution API)

Ce guide explique comment configurer l'intégration WhatsApp bidirectionnelle avec l'API Evolution.

## Architecture

1.  **Envoi (Client -> WhatsApp)** :
    - Le visiteur envoie un message sur le site (`live-chat.tsx`).
    - Le message est enregistré dans Firestore (`visitor_chats`).
    - Une requête API est envoyée à `/api/support/chat/send`.
    - L'API transmet le message à votre instance Evolution API via `sendText`.
    - Le message apparaît dans votre groupe WhatsApp de support.

2.  **Réception (WhatsApp -> Client)** :
    - L'admin répond dans le groupe WhatsApp en citant le message du visiteur (important pour le contexte).
    - Evolution API envoie un webhook à `/api/webhooks/whatsapp`.
    - Le serveur Next.js extrait l'ID de session depuis le message cité.
    - La réponse est ajoutée à Firestore.
    - Le client web (qui écoute Firestore) affiche la réponse instantanément.

## Prérequis

- Une instance Evolution API fonctionnelle (v2+ recommandée).
- Un numéro WhatsApp connecté à l'instance.
- Un groupe WhatsApp créé pour recevoir les messages (récupérer son JID, ex: `12036304...89@g.us`).

## Configuration

### 1. Variables d'environnement (`.env.local`)

Ajoutez ces variables à votre fichier `.env.local` (et sur Vercel) :

```bash
# URL de votre instance Evolution API (sans slash à la fin)
EVOLUTION_API_URL=https://api.votre-domaine.com

# Clé API globale (définie dans votre config Evolution)
EVOLUTION_API_KEY=votre-cle-api-secrete

# Nom de l'instance connectée
WhatsApp_INSTANCE_NAME=gerecole_support

# ID du groupe WhatsApp où les messages arrivent (JID)
WhatsApp_GROUP_ID=120363123456789@g.us
```

### 2. Configuration du Webhook (Evolution API)

Dans votre instance Evolution API, configurez le webhook pour l'instance `gerecole_support` :

- **URL** : `https://www.gerecole.com/api/webhooks/whatsapp`
- **Events** : Cochez `MESSAGES_UPSERT` (ou tous les messages).
- **Enabled** : Oui.

Si vous testez en local, utilisez ngrok pour exposer votre port 3000 :
`https://votre-tunnel-ngrok.io/api/webhooks/whatsapp`

## Utilisation

1.  **Côté Visiteur** : Ouvrez le chat sur le site et envoyez un message.
2.  **Côté Admin** :
    - Vous recevrez le message dans le groupe WhatsApp avec l'ID du visiteur.
    - **Pour répondre** : Utilisez la fonction "Répondre" (Swipe droit ou Citer) sur le message du visiteur.
    - Écrivez votre réponse. Elle sera transmise au visiteur sur le site.

## Dépannage

- **Message non reçu sur WhatsApp** : Vérifiez les logs Vercel (`Function Logs`) pour `/api/support/chat/send`. Vérifiez `EVOLUTION_API_URL` et `WhatsApp_GROUP_ID`.
- **Réponse non reçue sur le site** :
    - Vérifiez que le webhook est bien configuré dans Evolution API.
    - Vérifiez les logs Vercel pour `/api/webhooks/whatsapp`.
    - Assurez-vous de bien **citer** le message original du visiteur pour que le système retrouve la session (`chatId`).
