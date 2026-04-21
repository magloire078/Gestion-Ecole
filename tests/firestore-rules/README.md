# Tests d'isolation Firestore

Ces tests vérifient que les règles de sécurité Firestore garantissent :

1. **Isolation multi-tenant** — un utilisateur de l'école A ne peut ni lire ni écrire sur l'école B
2. **Anti-élévation de privilège** — un utilisateur ne peut pas se promouvoir `isSuperAdmin`
3. **Accès parent** — un parent n'accède qu'à son propre enfant (fiche, notes)
4. **Codes d'accès parents** (`sessions_parents`) — création réservée au staff, désactivation irréversible
5. **Collections server-only** — `processedWebhooks`, `mail` lecture/écriture bloquées côté client

## Prérequis

- Firebase CLI (`npm i -g firebase-tools`)
- Java 11+ (requis par le Firestore emulator)

## Exécution

```bash
# One-shot (CI, local) — démarre l'emulator, exécute vitest, arrête l'emulator
npm run test:rules

# Mode watch (pendant le dev des règles)
firebase emulators:start --only firestore   # dans un terminal
npm run test:rules:watch                    # dans un autre
```

## Ajouter un test

1. Créer `tests/firestore-rules/<nom>.test.ts`
2. Importer `setupEnv` et `seed` depuis `./helpers`
3. Utiliser `assertSucceeds` / `assertFails` (depuis `@firebase/rules-unit-testing`)

Squelette :

```ts
import { beforeAll, beforeEach, afterAll, describe, test } from 'vitest';
import { assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { setupEnv, seed } from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => { env = await setupEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, { /* fixtures */ });
});

describe('feature', () => {
  test('scenario', async () => {
    const ctx = env.authenticatedContext('uid');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'path/id')));
  });
});
```
