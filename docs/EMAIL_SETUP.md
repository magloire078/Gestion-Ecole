# Guide d'envoi d'emails — Gestion-Ecole

L'application écrit tous ses emails dans la collection Firestore `mail/`. Un service tiers doit lire cette collection et envoyer les emails via un provider SMTP (SendGrid, Mailgun, Gmail SMTP, AWS SES, etc.).

La méthode recommandée est l'extension Firebase **« Trigger Email from Firestore »**.

## 1. Installer l'extension Firebase

### 1.1 Depuis la console

1. Ouvrez https://console.firebase.google.com
2. Projet → **Extensions** → **Explorer le hub d'extensions**
3. Recherchez **« Trigger Email from Firestore »** (par Firebase)
4. Cliquez **Installer dans un projet** → sélectionnez votre projet

### 1.2 Depuis la CLI

```bash
firebase ext:install firebase/firestore-send-email --project=<votre-projet>
```

## 2. Configurer le provider SMTP

Pendant l'installation, l'extension demande :

| Paramètre | Valeur |
|---|---|
| **Collection name** | `mail` |
| **SMTP connection URI** | `smtps://user:password@smtp.provider.com:465` |
| **Default FROM address** | `no-reply@votre-domaine.com` |
| **Default REPLY-TO address** | `support@votre-domaine.com` |
| **Users collection** (optionnel) | laisser vide |
| **Templates collection** (optionnel) | laisser vide |

### 2.1 SendGrid (recommandé)

1. Créez un compte sur https://sendgrid.com (free tier : 100 emails/jour)
2. **Settings → API Keys → Create API Key** (permissions : Full Access ou Mail Send)
3. SMTP URI : `smtps://apikey:<YOUR_API_KEY>@smtp.sendgrid.net:465`
4. Vérifiez votre domaine dans **Settings → Sender Authentication** (obligatoire pour la délivrabilité en production)

### 2.2 Mailgun

1. https://www.mailgun.com → créer un compte
2. Ajouter et vérifier votre domaine
3. **Sending → Domain settings → SMTP credentials**
4. SMTP URI : `smtps://postmaster@mg.votre-domaine.com:<PASSWORD>@smtp.mailgun.org:465`

### 2.3 Gmail (dev/tests uniquement)

Limité à ~500 emails/jour, non recommandé en production.

1. Compte Google → **Sécurité → Mots de passe d'application** (2FA requis)
2. Générer un mot de passe pour "Mail"
3. SMTP URI : `smtps://votre@gmail.com:<MOT_DE_PASSE_APP>@smtp.gmail.com:465`

### 2.4 AWS SES

1. Console AWS → SES → **SMTP settings → Create SMTP credentials**
2. Vérifier votre domaine et passer en mode production (sortie du sandbox)
3. SMTP URI : `smtps://<ACCESS_KEY>:<SECRET>@email-smtp.<region>.amazonaws.com:465`

## 3. Vérifier l'intégration

### 3.1 Test manuel

Depuis la console Firestore, créer un document dans la collection `mail/` :

```json
{
  "to": "votre@email.com",
  "message": {
    "subject": "Test Gestion-Ecole",
    "html": "<p>Ceci est un test.</p>"
  },
  "delivery": {
    "startTime": <timestamp>,
    "state": "PENDING"
  }
}
```

Dans les 30 secondes, le champ `delivery.state` doit passer à `SUCCESS` (ou `ERROR` avec un message).

### 3.2 Depuis l'app

- Créez une nouvelle école → l'email de bienvenue est envoyé
- Finalisez un paiement Stripe → le reçu est envoyé aux parents
- Consultez les logs de l'extension dans **Extensions → Trigger Email → Logs**

## 4. Emails envoyés par l'application

| Déclencheur | Destinataire | Fichier source |
|---|---|---|
| Création d'école | Directeur | `src/services/school-creation.ts` |
| Paiement abonnement réussi | Directeur | `src/lib/payment-processing.ts` |
| Paiement scolarité réussi | Parents | `src/lib/payment-processing.ts` |
| Compte rendu comptabilité | Admin | `src/app/dashboard/comptabilite/page.tsx` |
| Résultats compétition | Parents | `src/app/dashboard/activites/competitions/.../CompetitionClient.tsx` |
| Rappel de paiement | Parents | `src/app/dashboard/paiements/page.tsx` |

## 5. Règles Firestore

La collection `mail/` est protégée par les règles (`firestore.rules`) :

- **Create** : utilisateurs signed-in uniquement, avec validation de schéma (champs `to` et `message` requis, `subject` et `html`/`text` typés)
- **Read / Update / Delete** : interdit côté client (seule l'extension peut y accéder via Admin SDK)

Ceci empêche :
- Les utilisateurs anonymes d'envoyer du spam
- Un utilisateur de lire les emails envoyés par d'autres
- Un utilisateur de manipuler le statut de livraison

## 6. Limites et considérations

- **Rate limiting** : l'extension n'en implémente pas. Un utilisateur compromis pourrait enqueuer des milliers d'emails. Pour production, ajouter des règles sur un compteur Firestore ou un middleware Cloud Function qui vérifie le volume par utilisateur.
- **Spoofing** : l'expéditeur (`from`) est fixé par la config de l'extension, pas par l'application. C'est volontaire et prévient l'usurpation.
- **Templates** : les emails sont hardcodés en HTML dans le code source. Pour industrialiser, basculer vers la collection `templates` de l'extension et référencer par nom.
- **Délivrabilité** : en production, vérifier votre domaine (SPF, DKIM, DMARC) dans le DNS — sans ça, les emails atterrissent en spam.

## 7. Alternatives à l'extension

Si vous ne voulez pas dépendre d'une extension Firebase, deux options :

1. **Cloud Function custom** : écrire un trigger `onCreate` qui envoie via SDK Nodemailer/SendGrid/SES. Plus de contrôle, plus de code à maintenir.
2. **API route Next.js** : remplacer `mail-service.ts` pour poster sur un endpoint `/api/mail/send` qui appelle directement SendGrid. Nécessite de déployer un backend Node et de protéger l'endpoint (auth + rate limit).

## 8. Documentation officielle

- Extension : https://extensions.dev/extensions/firebase/firestore-send-email
- SendGrid API : https://docs.sendgrid.com
- Mailgun SMTP : https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/
