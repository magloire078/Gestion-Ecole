# Stratégie produit : de l'outil de gestion à la plateforme

> Document de **direction**, à ne pas confondre avec [`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md),
> qui décrit le produit **tel qu'il est aujourd'hui**. Ici on parle de là où l'on va.

## 1. Provenance et portée

Cette feuille de route reprend une analyse produite par ChatGPT en août 2026, à la demande
de porter GèreEcole au-delà du logiciel de gestion scolaire. Elle est conservée ici parce
qu'elle structure bien la réflexion — mais deux réserves doivent être posées d'emblée.

**Ce n'est pas un audit du produit.** Les sources citées dans cette analyse renvoient à
`gescole.com` et `gecole.com`, deux domaines distincts de `gerecole.com`. Le « j'ai consulté
votre site » porte donc vraisemblablement sur un autre site que le nôtre. Les
recommandations restent pertinentes sur le fond, mais aucune ne découle d'un examen réel de
notre produit. C'est précisément pourquoi la section 3 confronte chaque axe au code.

**La trajectoire à 5 ans est une trame de pitch, pas une prévision.** Elle est conservée
comme ambition affichée — utile face à un investisseur — et ne constitue aucun engagement.

## 2. Vision

Ne plus se présenter comme un « logiciel de gestion scolaire », mais comme
**le système d'exploitation des écoles africaines** : toute la vie de l'établissement passe
par la plateforme.

Trois piliers, dont la combinaison est difficile à copier :

1. **SaaS de gestion scolaire** — le produit actuel.
2. **IA éducative** — assistant pour directeurs, enseignants et élèves.
3. **Services financiers** — paiements, Mobile Money, assurance, crédit scolaire.

## 3. Les 13 axes, confrontés au code

### Déjà livrés

**Axe 8 · Application Offline First** ✅

Livré (commits `a3b316f` et `598f98a`). Cache Firestore persistant multi-onglets, écritures
non bloquantes hors ligne avec identifiants générés côté client, repli du contrôle de quota,
indicateurs de synchronisation (`fromCache` / `hasPendingWrites`), service worker web, et
coque mobile Capacitor via un double build. Voir `src/lib/offline-writes.ts`,
`src/hooks/use-sync-status.ts`, `public/sw.js`.

C'était le seul axe où un concurrent était explicitement cité comme en avance. Il ne l'est
plus.

**Axe 11 · Modèle SaaS par paliers** ✅

`src/lib/subscription-plans.ts` définit trois plans (Essentiel gratuit / Pro 49 900 CFA /
Premium 99 900 CFA) et **sept modules déjà tarifés** : santé, cantine, transport, internat,
RH & paie, immobilier, activités. Les plafonds sont appliqués via
`src/lib/subscription-guards.ts`. Restent à créer : les paliers « réseau d'écoles » et
« ministère ».

**Axe 2 · Écosystème, volet paiements** ✅

GeniusPay, Wave, Orange Money, MTN MoMo, PayDunya et Stripe sont intégrés
(`src/app/api/webhooks/`, `src/lib/genius-pay.ts`).

### Partiellement construits

**Axe 2 · Écosystème, volet tiers** 🟡

Transport, cantine et bibliothèque existent **comme modules internes**, pas comme
connexions à des acteurs externes. Aucun connecteur vers banques, assurances, libraires,
fournisseurs d'uniformes, ministères ou examens nationaux.

**Axe 5 · Super-application parents** 🟡

Existent : portail parent (`src/app/dashboard/parent/`), rattachement par code d'accès
(`src/app/parent-access/`), consultation des notes et absences, paiement de la scolarité,
notifications. Manquent : suivi du bus, réservation de cantine, signature d'autorisations,
demande d'attestation, achat de fournitures.

**Axes 9 et 10 · Score de santé et Business Intelligence** 🟡

⚠️ **Un score de santé existe déjà, mais il ne s'adresse pas au bon destinataire.**
`src/app/api/admin/health/route.api.ts` note quatre dimensions — `setup`, `adoption`,
`activity`, `subscription` — pour mesurer le **risque de désabonnement d'une école cliente**.
C'est un outil de rétention **pour nous, éditeur**.

Le *School Health Score* proposé (finances, réussite, discipline, présence, satisfaction,
trésorerie) s'adresse au **directeur d'établissement**, pour lui montrer où agir dans son
école. Ce sont deux produits différents, et le second n'existe pas.

Même écart pour la BI : `/api/admin/kpis` et `src/components/admin/commercial-kpis.tsx`
produisent nos KPIs **commerciaux**. `src/app/dashboard/analytics` couvre partiellement le
besoin des directeurs (évolution des inscriptions, taux d'impayés), mais pas la rentabilité,
les matières difficiles ni les prévisions financières.

### Non commencés

**Axe 3 · L'IA comme différenciateur** ❌ — voir section 4, c'est le point critique.

**Axe 4 · Marketplace** ❌ — aucune brique.

**Axe 6 · Offre gouvernement (B2G)** ❌ — aucune vue ministère, inspection ou direction
régionale. C'est pourtant l'axe qui ouvre le plus grand marché.

**Axe 7 · API ouverte** ❌ — les 22 routes de `src/app/api/` sont internes et désormais
restreintes par CORS (`src/lib/api-cors.ts`). Ouvrir une API publique suppose
authentification par clé, quotas, versionnement et documentation : un chantier à part
entière.

**Axes 12-13 · Marque et financements** — hors code.

## 4. L'écart le plus important : l'IA n'existe pas

L'IA est mise en avant commercialement et désignée comme différenciateur principal.
Vérification faite dans la base de code :

- **Six paquets Genkit** sont installés (`@genkit-ai/core`, `@genkit-ai/firebase`,
  `@genkit-ai/google-cloud`, `@genkit-ai/google-genai`, `genkit`, `genkit-cli`) —
  **aucun n'est importé**, ni dans `src/`, ni dans `functions/src/`.
- `src/ai/flows/generate-report-card-comment.ts` est un **stub explicite** : il porte le
  commentaire « sera implémentée dans une version ultérieure » et un
  `TODO: Implémenter avec Genkit AI`. Il retourne un texte assemblé à partir d'une moyenne
  arithmétique.
- `proposeDecisions` (`functions/src/index.ts:733`) est **entièrement à base de règles** :
  seuils de jours d'inactivité, comptages, dates d'échéance. Aucune inférence.
- La route dite « assistant support IA » (`src/app/api/support/chat/send/`) envoie des
  messages **WhatsApp** via Evolution API. Aucun modèle de langage.

**Aucun appel à un modèle de langage n'existe aujourd'hui dans le produit.**

C'est à la fois le plus grand écart entre le discours et le produit — donc un risque de
crédibilité — et l'écart le plus rapide à combler : la dépendance est déjà installée et un
premier flux est déjà esquissé.

### Premier pas concret

`generateReportCardComment` est le bon candidat pour le premier vrai appel à un modèle : la
fonction existe, son contrat d'entrée/sortie est défini, elle est déjà appelée par le
produit, et l'échec est sans gravité (on retombe sur le texte générique actuel). Elle
transforme une promesse commerciale en fonctionnalité réelle sans rien casser.

Viennent ensuite, par ordre de valeur perçue : génération de sujets d'évaluation,
détection d'élèves à risque (les données de notes, absences et discipline sont déjà
structurées), puis assistant de réponse aux parents.

## 5. Trajectoire indicative à 5 ans

> Ambition de pitch, non un engagement.

| Année | Écoles | Jalons |
|---|---|---|
| 1 | 100 | Côte d'Ivoire + Togo · application mobile · Mobile Money |
| 2 | 500 | Burkina Faso, Sénégal, Bénin · IA avancée |
| 3 | 2 000 | Marketplace · API · tableau de bord ministériel |
| 4 | 5 000 | Paiement intégré · crédit scolaire · assurance |
| 5 | 10 000 | Plusieurs pays · levée de série A |

## 6. Indicateurs attendus par les investisseurs

Nombre d'écoles clientes · taux de rétention · revenu mensuel récurrent (MRR) · coût
d'acquisition client (CAC) · valeur vie client (LTV).

**Aucun de ces cinq indicateurs n'est mesuré aujourd'hui.** `/api/admin/kpis` produit des
KPIs commerciaux d'un autre ordre. Le score de santé client
(`src/app/api/admin/health/route.api.ts`) fournit en revanche une base sérieuse pour
calculer la rétention : c'est le point de départ le moins coûteux.

## 7. Priorités recommandées

1. **Brancher une vraie IA** — l'écart discours/produit est le risque le plus immédiat, et
   la pile est déjà en place.
2. **Instrumenter MRR et rétention** — sans ces chiffres, aucune conversation avec un
   investisseur n'est possible.
3. **Le School Health Score côté directeur** — forte valeur perçue, et les données
   (finances, notes, absences, discipline) sont déjà toutes dans Firestore.
4. **L'offre B2G** — le plus grand marché, mais le cycle de vente le plus long : à préparer
   pendant que les trois premiers points s'installent.
