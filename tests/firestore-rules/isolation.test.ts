/**
 * Multi-tenant isolation — a user belonging to school A must not be able to
 * read or write any document under another school.
 *
 * Requires the Firestore emulator on 127.0.0.1:8080 (see README / npm script).
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import {
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
      directorB: { isSuperAdmin: false, schools: { schoolB: 'directeur' } },
      outsider: { isSuperAdmin: false, schools: {} },
    },
    schools: {
      schoolA: { directorId: 'directorA', name: 'École A' },
      schoolB: { directorId: 'directorB', name: 'École B' },
    },
    students: {
      schoolA: {
        studentA1: { schoolId: 'schoolA', firstName: 'Ali', parentIds: [] },
      },
      schoolB: {
        studentB1: { schoolId: 'schoolB', firstName: 'Bob', parentIds: [] },
      },
    },
  });
});

describe('multi-tenant isolation', () => {
  test('director of A cannot read school B doc', async () => {
    const ctx = env.authenticatedContext('directorA');
    await assertFails(getDoc(doc(ctx.firestore(), 'ecoles/schoolB')));
  });

  test('director of A can read their own school doc', async () => {
    const ctx = env.authenticatedContext('directorA');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'ecoles/schoolA')));
  });

  test('director of A cannot read a student from school B', async () => {
    const ctx = env.authenticatedContext('directorA');
    await assertFails(
      getDoc(doc(ctx.firestore(), 'ecoles/schoolB/eleves/studentB1')),
    );
  });

  test('director of A cannot write to school B students', async () => {
    const ctx = env.authenticatedContext('directorA');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'ecoles/schoolB/eleves/hacked'), {
        schoolId: 'schoolB',
        firstName: 'Mallory',
      }),
    );
  });

  test('outsider with no school membership cannot read any school', async () => {
    const ctx = env.authenticatedContext('outsider');
    await assertFails(getDoc(doc(ctx.firestore(), 'ecoles/schoolA')));
    await assertFails(getDoc(doc(ctx.firestore(), 'ecoles/schoolB')));
  });

  test('unauthenticated cannot read anything', async () => {
    const ctx = env.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'ecoles/schoolA')));
  });
});
