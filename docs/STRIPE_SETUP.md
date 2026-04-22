# Guide d'intégration Stripe — Gestion-Ecole

Ce guide détaille la configuration de Stripe pour accepter les paiements d'abonnements et de frais de scolarité.

## 1. Créer un compte Stripe

1. Créez un compte sur https://dashboard.stripe.com/register.
2. Activez le mode **Test** pour démarrer (toggle en haut à droite du dashboard).
3. Complétez les informations de votre entreprise dans **Paramètres → Informations du compte**.

## 2. Récupérer les clés API

Dans le dashboard Stripe :

- **Paramètres → Développeurs → Clés API**
- Notez la **Clé publiable** (commence par `pk_test_...` en test, `pk_live_...` en prod)
- Notez la **Clé secrète** (commence par `sk_test_...` en test, `sk_live_...` en prod)

Ajoutez-les à votre fichier `.env.local` (ou aux secrets Vercel/CI) :

```bash
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

> ⚠️ La clé secrète ne doit **jamais** être exposée côté client. Ne la préfixez jamais avec `NEXT_PUBLIC_`.

## 3. Configurer le webhook

Le webhook permet à Stripe de nous notifier des paiements réussis, échoués et remboursements.

### 3.1 En développement (avec Stripe CLI)

```bash
# Installer la CLI : https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:9002/api/webhooks/stripe
```

La CLI affichera un secret `whsec_...`. Copiez-le dans `.env.local` :

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.2 En production

1. Dashboard Stripe → **Développeurs → Webhooks → Ajouter un endpoint**
2. URL : `https://votre-domaine.com/api/webhooks/stripe`
3. Événements à écouter :
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Après création, copiez le **Signing secret** (`whsec_...`) dans les secrets Vercel :
   - `STRIPE_WEBHOOK_SECRET=whsec_...`

## 4. Vérifier l'intégration

### 4.1 Test de paiement

1. Allez sur la page d'abonnement de l'application
2. Choisissez un plan et cliquez « Payer avec Stripe »
3. Utilisez une carte de test Stripe :
   - Succès : `4242 4242 4242 4242`
   - Échec : `4000 0000 0000 0002`
   - Date : toute date future, CVC : 3 chiffres au choix

### 4.2 Vérifications côté serveur

Dans les logs de l'application, vous devez voir :

```
[Stripe Webhook] Event evt_xxx not yet processed, claiming...
[Stripe Webhook] Subscription PRO activated for school abc123
```

Et dans Firestore :

- `ecoles/{schoolId}.subscription.status` = `active`
- `ecoles/{schoolId}.subscription.lastPayment.sessionId` = session Stripe
- `processedWebhooks/stripe_{event.id}` existe (idempotence)

### 4.3 Test d'échec

Avec la carte `4000 0000 0000 0002`, le webhook doit créer un document dans :

```
ecoles/{schoolId}/paymentErrors/...
```

### 4.4 Test de remboursement

Dans le dashboard Stripe, remboursez un paiement de scolarité. Le webhook doit :

- Ajouter une écriture négative dans `ecoles/{schoolId}/comptabilite`
- Remettre le solde de l'élève à jour (`amountDue` augmenté)
- Marquer le paiement d'origine comme `refunded: true`

## 5. Passage en production

Avant de passer en mode **Live** :

- [ ] Activer le compte Stripe (KYC : documents d'identité, RIB, etc.)
- [ ] Remplacer les clés `pk_test_` / `sk_test_` par `pk_live_` / `sk_live_`
- [ ] Recréer le webhook avec l'URL de production et mettre à jour `STRIPE_WEBHOOK_SECRET`
- [ ] Tester un paiement réel avec un petit montant
- [ ] Vérifier que les emails de confirmation partent bien

## 6. Devises

Stripe Checkout ne supporte pas le **XOF** directement. L'application convertit automatiquement en **EUR** au taux fixe officiel **1 EUR = 655.957 XOF** (peg CFA). Les montants en XOF sont conservés dans les métadonnées de la session pour l'audit.

## 7. Sécurité — Points importants

- **Idempotence** : le webhook utilise `processedWebhooks/stripe_{event.id}` pour éviter de traiter deux fois le même événement (Stripe peut re-livrer).
- **Validation de prix** : pour les abonnements, le montant payé est comparé au prix du plan avec une tolérance de 1 %. En cas d'écart, l'abonnement n'est **pas** activé.
- **Signatures** : toute requête sans signature Stripe valide est rejetée (HTTP 400).

## 8. Fichiers clés

| Fichier | Rôle |
|---|---|
| `src/lib/stripe.ts` | Création des sessions Checkout |
| `src/app/api/payments/create-link/route.ts` | Endpoint unifié multi-providers |
| `src/app/api/webhooks/stripe/route.ts` | Réception des événements Stripe |
| `src/lib/payment-processing.ts` | Logique métier (activation, remboursement, erreurs) |

## 9. Support

Documentation Stripe : https://stripe.com/docs
Support Stripe : https://support.stripe.com
