# AGENTS.md — Conventions du projet Gestion-Ecole

Ce fichier documente les conventions du projet pour les agents IA (Claude Code, Antigravity, etc.) et les contributeurs humains.

## Stack Technique

- **Framework** : Next.js 14 (App Router) + TypeScript
- **UI** : Tailwind CSS + shadcn/ui + Framer Motion
- **Backend** : Firebase (Firestore, Auth, Storage)
- **Paiements** : Stripe
- **PDF** : jsPDF + jspdf-autotable
- **DND** : @dnd-kit
- **Déploiement** : Vercel

## Design System — "Hyper-Premium"

### Tokens de couleurs
| Rôle | Classe Tailwind |
|---|---|
| Actions primaires | `indigo-600` |
| Positif / Succès | `emerald-600` |
| Négatif / Danger | `rose-600` |
| Titres | `slate-900` |
| Texte secondaire | `slate-500` |

### Glassmorphism (mode clair)
```
bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl
```
> ⚠️ Ne PAS utiliser `text-white` ou `bg-white/5` sur les composants du dashboard — la page est en mode clair.

### Typographie
- Titres : `font-black tracking-tight`
- Labels de formulaire : `text-xs font-black uppercase tracking-widest text-slate-400`
- Valeurs numériques : `font-mono` ou `tabular-nums`

### Rayons de bordure
- Cartes principales : `rounded-2xl`
- Boutons / inputs : `rounded-xl`
- Badges : `rounded-full`

### Animations
- Utiliser `framer-motion` pour les entrées de composants (`initial`, `animate`)
- Micro-interactions : `hover:scale-105 active:scale-95 transition-all`
- Éviter les animations lourdes (pas de `animate-pulse` sur de grands éléments)

## Conventions de Code

### Structure des fichiers
```
src/
├── app/dashboard/           # Pages (App Router)
├── components/              # Composants réutilisables
│   └── ui/                  # Primitives shadcn/ui
├── hooks/                   # Custom hooks (use-*.ts)
├── services/                # Services métier (Firebase, PDF, etc.)
├── lib/                     # Utilitaires, types, config
└── firebase/                # Configuration Firebase
```

### Règles CSS
- **Pas de `style={{ }}` inline** dans le JSX. Utiliser un `useRef` + `useEffect` pour les styles dynamiques (ex: couleurs de matières).
- Préférer les classes Tailwind aux CSS modules.

### Hooks personnalisés
- Nommage : `use-kebab-case.ts` → `export function useCamelCase()`
- Toujours exporter les types associés depuis le même fichier.

## Git & Commits

### Format des commits
```
<type>(<scope>): <description courte>

[corps optionnel avec détails]
```

### Types autorisés
| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Refactorisation sans changement fonctionnel |
| `style` | Changements visuels / CSS uniquement |
| `docs` | Documentation |
| `chore` | Maintenance (deps, config) |

### Scopes courants
`ui`, `dashboard`, `auth`, `billing`, `timetable`, `grades`, `payments`, `rh`, `pdf`, `api`

### Exemple
```
feat(ui): implement hyper-premium glassmorphism on timetable module

- Modernized DraggableTimetableEntry with accent borders
- Enhanced DND feedback with blur overlay and scale
- Updated TimetableForm with premium layout
```

## Avant un Push

```bash
# 1. Vérifier que le build passe
npx next build

# 2. Pas de tests unitaires configurés pour le moment (TODO)

# 3. Déployer sur Vercel
npx vercel --prod
```

## Points d'Attention

1. **Firebase** : Les règles Firestore sont en mode authentifié. Toute nouvelle collection doit être ajoutée aux rules.
2. **Stripe** : `STRIPE_SECRET_KEY` n'est pas définie en local — les fonctions de paiement ne marchent qu'en production.
3. **PDF** : Les rapports PDF utilisent `AccountingReportsService` avec un branding école (logo + palette Indigo/Slate).
4. **Responsive** : Toujours vérifier les breakpoints `md:` et `lg:` pour le layout sidebar.
5. **Performances** : Surveiller l'INP (Interaction to Next Paint) — éviter les handlers synchrones lourds sur les boutons.
