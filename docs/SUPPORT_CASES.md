# Journal des cas support

Historique des problèmes signalés par des abonnés, avec cause racine et
correctif appliqué — pour retrouver rapidement la solution si un autre
abonné rencontre le même symptôme.

---

## 2026-10 — Devise bloquée en FCFA + impossible d'ajouter des classes (école professionnelle hors zone CFA)

**Abonné** : CDJ École Professionnelle (Haïti), école de formation
professionnelle (filières type coiffure, informatique, couture…).

**Symptômes signalés**
- La devise reste affichée en FCFA au lieu de la monnaie locale (Gourdes,
  HTG).
- Impossible d'ajouter les classes réelles de l'établissement.

**Cause racine**
1. Le pays de l'école se choisit **une seule fois**, à l'inscription
   (`src/app/onboarding/create-school/page.tsx`), avec comme valeur par
   défaut `DEFAULT_COUNTRY = 'CI'` (`src/lib/countries-data.ts`). Avant ce
   correctif, **rien ne permettait de le changer après coup** — ni en
   libre-service côté établissement, ni même depuis le panneau Super-Admin.
   Un pays mal choisi (ou laissé par défaut) bloquait donc la devise pour
   toujours, même quand ce pays est pleinement supporté par l'app (Haïti/HTG
   inclus — voir `currency-utils.ts`).
2. Le pays choisi détermine aussi le **modèle pédagogique auto-généré** à
   l'inscription (`src/lib/templates.ts`) : cycles/niveaux K-12 classiques
   (Préscolaire → Secondaire), pensés pour une école générale — pas pour une
   école **professionnelle**. Le plan Essentiel plafonne à 5 cycles
   (`src/lib/subscription-plans.ts`, `maxCycles`) ; ces cycles non
   pertinents, déjà pré-remplis par le template, saturent ce plafond et
   bloquent la création d'un cycle correspondant aux vraies filières de
   l'établissement (`CyclesService.createCycle` lève une erreur
   `LIMIT_REACHED` une fois le plafond atteint).

**Correctif**
- PR #31 — ajout d'un champ « Pays » éditable dans le formulaire d'édition
  d'école du panneau Super-Admin (`/admin/system/schools` →
  `src/components/admin/school-edit-form.tsx`), pour corriger la devise
  sans intervention manuelle en base.
- Pour les classes : pas de bug à proprement parler, juste un onboarding
  mal adapté à ce cas. La solution est un geste manuel côté abonné :
  1. Paramètres → Structure Pédagogique → onglet « Cycles & Niveaux ».
  2. Supprimer les cycles K-12 non pertinents (niveaux d'abord, puis le
     cycle — les deux suppressions sont bloquées tant qu'il reste des
     classes/niveaux rattachés).
  3. Créer un cycle personnalisé (ex. « Formation Professionnelle ») avec
     les filières de l'école comme niveaux.
  4. Créer les classes dans l'onglet « Classes », rattachées à ces niveaux.

**Si ça se reproduit**
- Vérifier le pays de l'école (`school.country` dans Firestore, ou via
  `/admin/system/schools` après la PR #31) et le corriger si besoin.
- Vérifier le nombre de cycles existants vs. `maxCycles` du plan
  (`src/lib/subscription-plans.ts`) — si saturé par des cycles non utilisés,
  guider l'abonné pour en supprimer avant d'en créer un nouveau.
- Piste de fond non traitée ici : il n'existe toujours pas de **template
  "vocationnel/professionnel"** dans `templates.ts` — à envisager si ce cas
  se répète pour plusieurs écoles professionnelles.
