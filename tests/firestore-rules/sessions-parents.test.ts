/**
 * Parent access codes (sessions_parents). Current rules: creation and read
 * are open to anyone (including unauthenticated clients) — the code itself
 * is the secret, validated server-side by /api/onboarding/join-parent.
 * Only a super-admin can update or delete a session document directly from
 * the client.
 *
 * NOTE: `allow read: if true` on this collection also permits listing every
 * session document (not just get-by-id), which effectively makes all parent
 * access codes enumerable by anyone. That's a separate finding from what
 * these tests protect against (regressions to the current, already-fairly-
 * open behavior) — flagged for a deliberate follow-up decision rather than
 * changed here.
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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
      directorA: { isSuperAdmin: false, schools: { schoolA: 'directeur' } },
      outsider: { isSuperAdmin: false, schools: {} },
      superAdmin: { isSuperAdmin: true },
    },
    schools: {
      schoolA: { directorId: 'directorA' },
    },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as any;
    await setDoc(doc(db, 'sessions_parents/existing'), {
      schoolId: 'schoolA',
      code: 'ABC',
      isActive: true,
    });
  });
});

describe('sessions_parents create/read', () => {
  test('any signed-in user can create a session doc', async () => {
    const ctx = env.authenticatedContext('outsider');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'sessions_parents/new1'), {
        schoolId: 'schoolA',
        code: 'XYZ',
        isActive: true,
      }),
    );
  });

  test('unauthenticated can create a session doc (code is the secret)', async () => {
    const ctx = env.unauthenticatedContext();
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'sessions_parents/anon'), {
        schoolId: 'schoolA',
        code: 'ANON',
        isActive: true,
      }),
    );
  });

  test('any signed-in user can read a session doc by id', async () => {
    const ctx = env.authenticatedContext('outsider');
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'sessions_parents/existing')),
    );
  });
});

describe('sessions_parents update/delete', () => {
  test('a regular signed-in user cannot update a session doc', async () => {
    const ctx = env.authenticatedContext('outsider');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'sessions_parents/existing'), {
        isActive: false,
      }),
    );
  });

  test('a director cannot update a session doc either', async () => {
    const ctx = env.authenticatedContext('directorA');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'sessions_parents/existing'), {
        isActive: false,
      }),
    );
  });

  test('super admin can update a session doc', async () => {
    const ctx = env.authenticatedContext('superAdmin');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'sessions_parents/existing'), {
        isActive: false,
      }),
    );
  });
});
