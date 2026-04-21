/**
 * Parent access codes (sessions_parents): creation must require a staff
 * member with manageUsers permission; reading is open to signed-in users
 * (needed for parents to join via code); update is locked to flipping
 * isActive from true to false.
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
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { seed, setupEnv } from './helpers';

// Use any for admin-context firestore to bypass strict typing mismatch with
// @firebase/rules-unit-testing's return types.

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
      staffA: { isSuperAdmin: false, schools: { schoolA: 'admin' } },
      directorA: { isSuperAdmin: false, schools: { schoolA: 'directeur' } },
      outsider: { isSuperAdmin: false, schools: {} },
    },
    schools: {
      schoolA: { directorId: 'directorA' },
    },
    personnel: {
      schoolA: {
        staffA: { email: 'a@a.com', adminRole: 'secretary' },
      },
    },
    adminRoles: {
      schoolA: {
        secretary: { permissions: { manageUsers: true } },
        janitor: { permissions: { manageUsers: false } },
      },
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

describe('sessions_parents creation', () => {
  test('staff with manageUsers can create', async () => {
    const ctx = env.authenticatedContext('staffA');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'sessions_parents/new1'), {
        schoolId: 'schoolA',
        code: 'XYZ',
        isActive: true,
      }),
    );
  });

  test('director can create', async () => {
    const ctx = env.authenticatedContext('directorA');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'sessions_parents/new2'), {
        schoolId: 'schoolA',
        code: 'DEF',
        isActive: true,
      }),
    );
  });

  test('outsider cannot create', async () => {
    const ctx = env.authenticatedContext('outsider');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'sessions_parents/bad'), {
        schoolId: 'schoolA',
        code: 'HACK',
        isActive: true,
      }),
    );
  });

  test('unauthenticated cannot create', async () => {
    const ctx = env.unauthenticatedContext();
    await assertFails(
      setDoc(doc(ctx.firestore(), 'sessions_parents/anon'), {
        schoolId: 'schoolA',
        code: 'ANON',
        isActive: true,
      }),
    );
  });
});

describe('sessions_parents update', () => {
  test('signed-in user can flip isActive true -> false', async () => {
    const ctx = env.authenticatedContext('outsider');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'sessions_parents/existing'), {
        isActive: false,
      }),
    );
  });

  test('signed-in user cannot re-activate (false -> true)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as any;
      await updateDoc(doc(db, 'sessions_parents/existing'), {
        isActive: false,
      });
    });
    const ctx = env.authenticatedContext('outsider');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'sessions_parents/existing'), {
        isActive: true,
      }),
    );
  });
});
