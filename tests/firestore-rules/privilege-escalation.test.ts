/**
 * Privilege-escalation guards. A regular user must never be able to grant
 * themselves isSuperAdmin, admin API access (profile.isAdmin), nor a role on
 * a school via `users/{uid}.schools` — the exact bug fixed in this
 * codebase: without this guard, any authenticated account could self-write
 * `schools: { anySchoolId: 'directeur' }` and take over another school's
 * data with no invitation code at all.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  test,
} from 'vitest';
import {
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { seed, setupEnv } from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await setupEnv();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    users: {
      normalUser: { isSuperAdmin: false, schools: {} },
      staffUser: { isSuperAdmin: false, schools: { schoolA: 'enseignant' } },
      superAdmin: { isSuperAdmin: true },
    },
    schools: {
      schoolA: { directorId: 'directorA' },
    },
  });
});

describe('users/{uid} — isSuperAdmin / profile.isAdmin escalation', () => {
  test('user cannot create their doc with isSuperAdmin=true', async () => {
    const ctx = env.authenticatedContext('newUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/newUser'), {
        isSuperAdmin: true,
      }),
    );
  });

  test('user cannot create their doc with profile.isAdmin=true', async () => {
    const ctx = env.authenticatedContext('newUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/newUser'), {
        profile: { isAdmin: true },
      }),
    );
  });

  test('user can create their own doc without privileged fields', async () => {
    const ctx = env.authenticatedContext('newUser');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users/newUser'), {
        displayName: 'Alice',
      }),
    );
  });

  test('user cannot self-elevate by updating isSuperAdmin=true', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        isSuperAdmin: true,
      }),
    );
  });

  // NOTE: `create` on users/{userId} does not check request.auth.uid ==
  // userId (only `update` does) — a signed-in user CAN create another
  // user's doc, as long as no privileged field is set. This is a known,
  // separately-tracked gap (low severity: Firebase UIDs aren't guessable,
  // and it stops applying once the real doc exists), not something this
  // regression suite asserts against.

  test('super admin can flip isSuperAdmin flag on another user', async () => {
    const ctx = env.authenticatedContext('superAdmin');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        isSuperAdmin: true,
      }),
    );
  });
});

describe('users/{uid}.schools — tenant takeover escalation', () => {
  test('user cannot create their doc with schools pre-populated', async () => {
    const ctx = env.authenticatedContext('newUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/newUser'), {
        schools: { schoolA: 'directeur' },
      }),
    );
  });

  test('user with no schools cannot self-grant a role by updating', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        schools: { schoolA: 'directeur' },
      }),
    );
  });

  test('user with an existing school role cannot upgrade it by updating', async () => {
    const ctx = env.authenticatedContext('staffUser');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'users/staffUser'), {
        schools: { schoolA: 'directeur' },
      }),
    );
  });

  test('user can update unrelated fields while leaving schools untouched', async () => {
    const ctx = env.authenticatedContext('staffUser');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'users/staffUser'), {
        displayName: 'Nouveau nom',
      }),
    );
  });

  test('super admin can grant a school role on behalf of a user', async () => {
    const ctx = env.authenticatedContext('superAdmin');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        schools: { schoolA: 'directeur' },
      }),
    );
  });
});

describe('users/{uid}.commercialAccess — restricted-role escalation', () => {
  test('user cannot create their doc with commercialAccess=true', async () => {
    const ctx = env.authenticatedContext('newUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/newUser'), {
        commercialAccess: true,
      }),
    );
  });

  test('user cannot self-grant commercialAccess by updating', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        commercialAccess: true,
      }),
    );
  });

  test('user can update unrelated fields while leaving commercialAccess untouched', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        displayName: 'Nouveau nom',
      }),
    );
  });

  test('super admin can grant commercialAccess on behalf of a user', async () => {
    const ctx = env.authenticatedContext('superAdmin');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        commercialAccess: true,
      }),
    );
  });
});

describe('server-only collections', () => {
  test('no client can read processedWebhooks', async () => {
    const ctx = env.authenticatedContext('superAdmin');
    await assertFails(
      getDoc(doc(ctx.firestore(), 'processedWebhooks/stripe_evt_1')),
    );
  });

  test('no client can write processedWebhooks', async () => {
    const ctx = env.authenticatedContext('superAdmin');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'processedWebhooks/stripe_evt_1'), {
        processedAt: new Date(),
      }),
    );
  });

  test('mail queue: no client can read/list', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertFails(getDocs(collection(ctx.firestore(), 'mail')));
  });

  test('mail queue: signed-in client cannot enqueue directly (serveur uniquement)', async () => {
    // L'écriture directe dans `mail` est désormais interdite aux clients
    // (règle `allow create: if false`) : tout email passe par la route serveur
    // /api/mail/send (Admin SDK), qui authentifie l'appelant et estampille
    // l'auteur, empêchant l'injection d'emails arbitraires depuis un compte
    // authentifié quelconque.
    const ctx = env.authenticatedContext('normalUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'mail/test'), {
        to: 'x@y.com',
        message: { subject: 'hi', html: '<p>hi</p>' },
      }),
    );
  });

  test('mail queue: unauthenticated cannot enqueue', async () => {
    const ctx = env.unauthenticatedContext();
    await assertFails(
      setDoc(doc(ctx.firestore(), 'mail/anon'), {
        to: 'x@y.com',
        message: { subject: 'hi', html: '<p>hi</p>' },
      }),
    );
  });
});
