/**
 * Parent access codes (sessions_parents). Creation stays open to anyone
 * (ParentAccessGenerator writes from the client with no permission check on
 * this collection). Read/update/delete are locked to super-admin: no client
 * code actually reads this collection directly (validating a code happens
 * server-side, Admin SDK, via /api/onboarding/join-parent) — `allow read:
 * if true` used to make every parent access code enumerable via a plain
 * collection listing, even unauthenticated. Locked down to match write.
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

describe('sessions_parents create', () => {
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
});

describe('sessions_parents read', () => {
  test('a regular signed-in user cannot read a session doc', async () => {
    const ctx = env.authenticatedContext('outsider');
    await assertFails(
      getDoc(doc(ctx.firestore(), 'sessions_parents/existing')),
    );
  });

  test('a director cannot read a session doc either', async () => {
    const ctx = env.authenticatedContext('directorA');
    await assertFails(
      getDoc(doc(ctx.firestore(), 'sessions_parents/existing')),
    );
  });

  test('unauthenticated cannot read a session doc', async () => {
    const ctx = env.unauthenticatedContext();
    await assertFails(
      getDoc(doc(ctx.firestore(), 'sessions_parents/existing')),
    );
  });

  test('super admin can read a session doc', async () => {
    const ctx = env.authenticatedContext('superAdmin');
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
