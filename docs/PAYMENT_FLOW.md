# Flux de paiement — GèreEcole

Ce document décrit le parcours complet d'un paiement (abonnement ou
scolarité) côté utilisateur, côté API, et côté webhook PSP.

## 1. Vue d'ensemble

```
[UI Abonnement] ──► [UI Paiement] ──► [/api/payments/create-link]
                                              │
                                              ▼
                                       [SDK PSP] (Stripe, PayDunya, ...)
                                              │
                                              ▼
                                  URL de checkout (page hors GèreEcole)
                                              │
                                              ▼
                            Utilisateur saisit ses infos de paiement
                                              │
                                ┌─────────────┴──────────────┐
                                ▼                            ▼
                       Redirection success                Webhook IPN
                  /payment/success?type=...     /api/webhooks/{psp}
                                                            │
                                                            ▼
                                              processSubscriptionPayment
                                              processTuitionPayment
                                              ► update Firestore
                                              ► email + notification
```

**Principe clé** : GèreEcole **n'affiche jamais de formulaire de carte ni
de Mobile Money** sur ses pages. L'utilisateur est redirigé vers la page
hostée du PSP (Stripe Checkout, PayDunya Checkout, Wave Checkout, etc.),
qui s'occupe de collecter et tokeniser les données sensibles. Cela évite
le périmètre PCI-DSS sur notre infrastructure.

## 2. Étapes côté utilisateur

### Étape 1 — Choix du plan
**Route** : `/dashboard/parametres/abonnement`

L'utilisateur voit les 3 cards (Essentiel, Pro/Standard, Premium) et clique
sur **« Choisir le Plan X »**. Cela construit une URL :

```
/dashboard/parametres/abonnement/paiement
  ?plan=Pro
  &price=250
  &description=Abonnement Pro pour Mon École
```

### Étape 2 — Choix de la durée et du fournisseur
**Route** : `/dashboard/parametres/abonnement/paiement`

L'utilisateur :
1. Sélectionne la **durée** (1, 3 ou 12 mois). Le total se recalcule.
2. Voit le **récapitulatif** : plan, mensuel, total, durée.
3. Clique sur un **fournisseur** parmi :
   - **Agrégateurs** : PayDunya (recommandé), Genius Pay
   - **Mobile Money direct** : Wave, Orange Money, MTN MoMo
   - **Carte bancaire** : Stripe
4. Pour MTN MoMo uniquement : saisit son numéro de téléphone (validation
   regex `^\d{8,15}$`).

### Étape 3 — Saisie des infos de paiement (hors GèreEcole)
L'utilisateur est redirigé vers la page du PSP. C'est **là** qu'il saisit :
- Numéro de carte + CVV + expiration (Stripe, PayDunya, Genius)
- Numéro de téléphone Wave / Orange Money
- OTP / code de validation Mobile Money

### Étape 4 — Retour vers GèreEcole
Une fois le paiement validé côté PSP :
- L'utilisateur est redirigé vers `/payment/success?type=subscription`
- Une page de confirmation s'affiche + redirection automatique vers
  `/dashboard/parametres/abonnement` après 5 s.

En cas d'échec : redirection vers `/payment/error?type=...`.

Pour MTN MoMo : redirection vers `/payment/pending` (le paiement est
push-based et nécessite que l'utilisateur valide sur son téléphone).

## 3. Étapes côté serveur

### a. Création du lien de paiement
**Endpoint** : `POST /api/payments/create-link`

Corps :
```json
{
  "provider": "stripe|paydunya|genius|wave|orangemoney|mtn",
  "type": "subscription|tuition",
  "schoolId": "...",
  "studentId": "...",         // si type=tuition
  "planName": "Pro",           // si type=subscription
  "duration": 1,               // mois, si type=subscription
  "amount": 250,
  "userEmail": "...",
  "userDisplayName": "...",
  "phone": "..."               // si provider=mtn
}
```

**Logique** :
1. Validation des paramètres.
2. Construction d'une **référence de paiement** unique :
   - `tuition__{schoolId}__{studentId}__{amount}`
   - `subscription__{schoolId}__{planName}__{duration}__{amount}`
   (Voir `src/lib/payment-reference.ts`.)
3. Appel au SDK du PSP avec `successUrl`, `errorUrl`, `callbackUrl`.
4. Retour de l'URL de checkout au client.

Le `BASE_URL` est résolu **dynamiquement** depuis la requête entrante
(headers `x-forwarded-host` / `host`) si `NEXT_PUBLIC_BASE_URL` n'est pas
défini. Cela évite que les URLs de retour pointent vers `localhost:3000`
en production.

### b. Webhook IPN
Chaque PSP a son endpoint :

| PSP        | Endpoint                          | Vérification |
|------------|-----------------------------------|--------------|
| Stripe     | `/api/webhooks/stripe`            | HMAC `stripe-signature` (SDK officiel) |
| Wave       | `/api/webhooks/wave`              | HMAC SHA256 `wave-signature` |
| Orange Money | `/api/webhooks/orangemoney`     | HMAC SHA256 `x-orange-signature` |
| MTN MoMo   | `/api/webhooks/mtn`               | HMAC SHA256 `x-callback-signature` |
| PayDunya   | `/api/webhooks/paydunya`          | `master_key` partagé |
| Genius Pay | `/api/webhooks/genius`            | HMAC SHA256 `x-genius-signature` |

Toutes les vérifications utilisent `crypto.timingSafeEqual` pour éviter
les attaques par timing.

**Mode dégradé** : si le secret n'est pas configuré, un warning est loggé
et la vérification est désactivée (utile en dev). En **production**,
configurez tous les secrets.

### c. Traitement post-paiement
`src/lib/payment-processing.ts` expose deux fonctions appelées par tous
les webhooks :

- `processSubscriptionPayment(schoolId, planName, durationMonths, provider)`
  1. Met à jour `subscription.plan/status/endDate` sur le doc école.
  2. Envoie un email de confirmation au directeur.
  3. Crée une notification temps réel pour le directeur/admin.

- `processTuitionPayment(schoolId, studentId, amountPaid, provider)`
  1. Valide le montant (> 0, plafonné à `amountDue`).
  2. Décrémente `student.amountDue` et met à jour `tuitionStatus`.
  3. Crée une entrée dans `comptabilite/`.
  4. Crée une entrée dans `eleves/{id}/paiements/`.
  5. Incrémente `stats/finance.totalAmountDue` (négatif).
  6. Envoie reçu email + notification temps réel à chaque parent.

## 4. Variables d'environnement requises

### Stripe
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Wave
```
WAVE_API_KEY=...
WAVE_WEBHOOK_SECRET=...
```

### Orange Money
```
ORANGE_MONEY_AUTH_HEADER=Basic ...
ORANGE_MONEY_MERCHANT_KEY=...
ORANGE_MONEY_WEBHOOK_SECRET=...
```

### MTN MoMo
```
MTN_PRIMARY_KEY=...
MTN_API_USER_ID=...
MTN_API_KEY=...
MTN_API_BASE_URL=https://...       # sandbox ou live
MTN_TARGET_ENVIRONMENT=sandbox     # ou production
MTN_CURRENCY=EUR                   # ou XOF en prod
MTN_WEBHOOK_SECRET=...
```

### PayDunya
```
PAYDUNYA_MASTER_KEY=...
PAYDUNYA_PUBLIC_KEY=...
PAYDUNYA_PRIVATE_KEY=...
PAYDUNYA_TOKEN=...
```

### Genius Pay
```
NEXT_PUBLIC_GENIUS_PAY_API_URL=https://pay.genius.ci/api/v1/merchant
NEXT_PUBLIC_GENIUS_PAY_API_KEY=pk_sandbox_...
GENIUS_PAY_API_SECRET=sk_sandbox_...
GENIUS_WEBHOOK_SECRET=...
```

### Général
```
NEXT_PUBLIC_BASE_URL=https://app.gereecole.com   # (optionnel)
```

> Si `NEXT_PUBLIC_BASE_URL` n'est pas défini, le serveur déduit l'URL de
> retour à partir des headers de la requête. Définissez cette variable si
> vous utilisez un proxy qui ne propage pas correctement
> `x-forwarded-host`.

## 5. Tester en local

### Stripe
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

### PSP Mobile Money
Utilisez `ngrok` pour exposer votre dev local :
```bash
ngrok http 3000
# puis configurez les webhooks PSP sur https://abc.ngrok.io/api/webhooks/{psp}
```

### Genius Pay sandbox
Les clés `pk_sandbox_xxx` / `sk_sandbox_xxx` permettent de simuler des
paiements complets. Vérifiez que `NEXT_PUBLIC_BASE_URL` correspond bien
à votre URL ngrok pour que la redirection retour fonctionne.

## 6. Référence de paiement — format

Format unifié, séparateur `__` (double underscore) pour éviter les
collisions avec des `_` dans les IDs Firestore.

- Tuition : `tuition__{schoolId}__{studentId}__{amount}`
- Subscription : `subscription__{schoolId}__{planName}__{durationMonths}__{amount}`

Le parsing est centralisé dans `src/lib/payment-reference.ts`
(`buildPaymentReference` / `parsePaymentReference`).

## 7. Sécurité

- **Pas de stockage de données bancaires** côté GèreEcole : tout transite
  par les pages hostées des PSP.
- **Signatures HMAC vérifiées** sur tous les webhooks (sauf en mode
  dégradé si le secret n'est pas configuré).
- **Comparaison en temps constant** (`crypto.timingSafeEqual`).
- **Plafonnement du montant** dans `processTuitionPayment` pour éviter
  qu'un webhook forgé n'impute plus que le dû.
- **Validation Stripe** : le webhook vérifie aussi que le montant payé
  correspond au prix attendu (avec marge de 50 centimes pour les
  conversions XOF/EUR).

## 8. Limitations actuelles

- Les paiements MTN MoMo restent en **mode sandbox** par défaut tant que
  `MTN_API_BASE_URL` et `MTN_TARGET_ENVIRONMENT` ne sont pas overridés.
- La devise Stripe pour les abonnements est convertie XOF → EUR au taux
  fixe `655.957` (CFA-EUR). Pour les pays hors zone CFA, adapter.
- Les webhooks Wave / Orange Money / MTN ne valident **pas** que le
  montant payé correspond au montant attendu (cf. `processTuitionPayment`
  qui plafonne au `amountDue`, mais pas `processSubscriptionPayment`).
