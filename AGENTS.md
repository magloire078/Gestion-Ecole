# Conventions du projet — Gestion-Ecole

> Document destiné aux agents (humains ou IA) qui contribuent à ce repo.
> Si tu démarres une session sans contexte, lis ce fichier en premier.

## TL;DR

- SaaS de gestion scolaire multi-établissements (Next.js 14, Firebase Auth+Firestore, Cloudinary).
- Multi-tenant strict : toute donnée est sous `ecoles/{schoolId}/...`.
- Permissions via `hasPermission(schoolId, 'manageX')` côté règles Firestore.
- Avant tout push : `npx tsc --noEmit` doit passer ; pour toute modif de `firestore.rules`, lancer aussi `npm run test:rules`.
- Commits style **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

## Stack

| Couche | Tech |
|---|---|
| Framework | Next.js 14 (App Router, RSC + 'use client' où nécessaire) |
| Langage | TypeScript strict |
| UI | shadcn/ui (`src/components/ui/`) + Tailwind + Radix + Framer Motion |
| Auth + DB | Firebase Auth + Firestore (Admin SDK côté serveur via `src/firebase/admin.ts`) |
| Uploads fichiers | **Cloudinary** (signed uploads — voir `src/lib/cloudinary-*.ts`) |
| Paiements | Stripe + providers africains (Wave, PayDunya, Orange Money, MTN MoMo) |
| Excel | **exceljs** (jamais `xlsx` — vulns connues) |
| AI | Genkit (`src/ai/`) pour la génération de bulletins/rapports |
| Mobile | Capacitor (iOS/Android wrapping) |
| Tests | Vitest + `@firebase/rules-unit-testing` (uniquement pour les règles Firestore aujourd'hui) |

## Layout du repo

```
src/
  app/
    api/                    routes serveur Next (webhooks Stripe, /api/cloudinary/sign…)
    auth/                   pages auth
    dashboard/              app authentifiée (1 dossier par module)
    onboarding/             flow inscription école
    {public-pages}/         landing, contact, privacy…
  components/
    ui/                     shadcn primitives — NE PAS éditer sans raison forte
    {feature}/              composants par domaine
  firebase/                 client + admin Firebase, hooks (useFirestore, useUser…)
  hooks/                    hooks React custom (useToast, useSchoolData, useSubscription…)
  lib/                      utils, intégrations (cloudinary, stripe, billing-calculator…)
  services/                 logique métier server-side (school-creation, staff-services…)
docs/
  USER_GUIDE.md             doc utilisateur final
  STRIPE_SETUP.md           setup Stripe pas à pas
  EMAIL_SETUP.md            setup extension Trigger Email
  DEPLOYMENT_GUIDE.md       déploiement Vercel
  WHATSAPP_INTEGRATION.md   intégration Evolution API
  BUSINESS_PLAN.md          (interne)
scripts/
  deploy-rules.sh           déploiement Firestore rules + indexes (pré-checks)
  test-cloudinary.ts        diagnostic creds Cloudinary
  seed-*.ts/.js             jeux de données de test
tests/
  firestore-rules/          tests d'isolation et de privilege escalation (vitest + emulator)
firestore.rules             règles Firestore (testées par tests/firestore-rules/)
firestore.indexes.json      index composés Firestore
firebase.json               config emulator + targets de déploiement
.env.example                template — JAMAIS de vraies valeurs
.env.local                  GITIGNORÉ — vraies valeurs locales
```

## Commandes essentielles

```bash
# Dev local
npm run dev                       # serveur Next sur :9002

# Validation avant commit
npx tsc --noEmit                  # strict typecheck — DOIT passer
npm run build                     # build complet (nécessite .env.local valide)

# Tests règles Firestore (Java 11+ et firebase-tools requis)
npm run test:rules                # one-shot — démarre l'emulator, lance vitest, kill
npm run test:rules:watch          # mode watch (emulator déjà lancé séparément)

# Déploiement (production)
PROJECT=greecole ./scripts/deploy-rules.sh           # rules + indexes (avec confirm)
TARGETS=firestore:rules PROJECT=greecole ./scripts/deploy-rules.sh   # subset

# Diagnostic Cloudinary
npx tsx scripts/test-cloudinary.ts
```

## Conventions de code

### Commits — Conventional Commits

```
<type>(<scope>): <résumé impératif court>

<corps explicatif optionnel : pourquoi, pas quoi>

https://claude.ai/code/session_<id>   # si fait via Claude Code
```

Types : `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `style`.

### Branches

- Features : `claude/<slug-court>` ou `feat/<slug>`
- Fixes : `fix/<slug>`
- Branche cible des PRs : `main`
- **Branche active actuelle** : `claude/add-french-greeting-4h3Sb`

### PRs

- Titre court (<70 chars) en français — résumé orienté valeur
- Body : `## Summary` (3 puces max) + `## Test plan` (checklist)

## Patterns à suivre

### Multi-tenancy (CRITIQUE)

Toute donnée d'école vit sous `ecoles/{schoolId}/...`. Les collections globales (`users`, `mail`, `processedWebhooks`, `visitor_chats`, `contact_requests`, `survey_responses`, `system_*`) sont les seules exceptions.

Côté client, toujours filtrer par `schoolId` même si les règles le font déjà — défense en profondeur. Utiliser le hook `useSchoolData()` pour récupérer le contexte école courant.

### Permissions

- Règles Firestore utilisent `hasPermission(schoolId, 'manageX')` qui combine super-admin / directeur / rôle granulaire
- Côté UI, vérifier `useUser()` + permissions du rôle pour cacher/désactiver les actions interdites
- Permissions disponibles : `manageUsers`, `manageClasses`, `manageGrades`, `viewGrades`, `manageAttendance`, `manageDiscipline`, `manageBilling`, `manageSchedule`, `manageCommunication`, `manageLibrary`, `manageCantine`, `manageTransport`, `manageInternat`, `manageRooms`, `manageInventory`, `manageMedical`, `manageSettings`, `manageActivities`

### Uploads de fichiers

**Toujours via Cloudinary signed uploads** :

```ts
import { uploadToCloudinary } from '@/lib/cloudinary-client';

const { secureUrl } = await uploadToCloudinary(file, {
  folder: `ecoles/${schoolId}/eleves/${studentId}/paiements`,
  resourceType: file.type.startsWith('image/') ? 'image' : 'raw',
});
```

Le folder doit commencer par `ecoles/` ou `temp/` (validé par `/api/cloudinary/sign`).

### Forms

- Toujours **react-hook-form + zod** (`@hookform/resolvers/zod`)
- Schémas zod en haut du composant ou dans `src/lib/schemas/`
- Boutons submit avec spinner via `useState` + `Loader2` de `lucide-react`

### Feedback utilisateur

- Toasts pour toute action async via `useToast()` de `@/hooks/use-toast` — succès et erreur
- Skeletons pendant les chargements (jamais de spinner full-page sauf vraie première hydratation)

### Variables d'env

- Côté client : préfixe `NEXT_PUBLIC_` obligatoire
- Côté serveur uniquement : **JAMAIS** `NEXT_PUBLIC_` (ex: `STRIPE_SECRET_KEY`, `CLOUDINARY_API_SECRET`)
- Lecture via `process.env.X` ; jamais de hard-coding
- Documenter toute nouvelle variable dans `.env.example`

## À NE PAS faire

- ❌ **Réintroduire Firebase Storage** — migration faite vers Cloudinary (commit `b84a2fc`). Storage payant et bucket désactivé sur le projet.
- ❌ **Importer `xlsx`** — remplacé par `exceljs`. Vulns prototype-pollution / ReDoS sans fix.
- ❌ **Committer `.env*`** sauf `.env.example`. `.gitignore` le bloque déjà — ne pas le contourner.
- ❌ **Contourner `hasPermission()`** dans les règles Firestore — toute exception ouvre un chemin de leak multi-tenant.
- ❌ **Activer `useBase64={false}`** sur `ImageUploader` (`src/components/image-uploader.tsx`) — c'est un mode déprécié, la prop `storagePath` est ignorée. Pour de vrais uploads, utiliser `uploadToCloudinary` directement.
- ❌ **`allow read, write: if true`** dans les rules — il y a déjà eu un bug critique là-dessus dans `storage.rules`, on ne refait pas la même.
- ❌ **`amend` ou `force-push` sur une branche poussée** — créer un nouveau commit.
- ❌ **`--no-verify` sur git commit** — les hooks (typecheck, lint) sont là pour une raison.
- ❌ **Modifier les composants `src/components/ui/*`** sauf si on met à jour shadcn de façon coordonnée.

## Avant chaque push

Checklist :

- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] Si `firestore.rules` modifié → `npm run test:rules` → 27/27 verts
- [ ] Si UI modifiée → vérifier visuellement dans `npm run dev`
- [ ] Pas de `console.log` de debug, pas de `TODO` flagrant
- [ ] Pas de secret en dur (rechercher `sk_test_`, `whsec_`, `AIza`, etc.)
- [ ] Commit message en Conventional Commits

## Coexistence avec d'autres agents (Antigravity, Cursor, etc.)

Plusieurs agents peuvent travailler sur ce repo. Pour éviter les conflits :

1. **Avant de commencer une session** : `git status` + `git pull`
2. **Avant de quitter** : commit + push (le hook `~/.claude/stop-hook-git-check.sh` le rappelle)
3. **Ne jamais éditer simultanément le même fichier** depuis 2 agents
4. **Préférer des branches courtes** (1 feature = 1 PR) plutôt que de longues branches dérivantes

## Documents complémentaires

- `docs/USER_GUIDE.md` — comment l'app est utilisée par directeur/staff/parent
- `docs/STRIPE_SETUP.md` — config Stripe (clés, webhook, test cards)
- `docs/EMAIL_SETUP.md` — extension Trigger Email + providers SMTP
- `docs/DEPLOYMENT_GUIDE.md` — déploiement Vercel + checklist prod
- `tests/firestore-rules/README.md` — comment ajouter un test de règle
