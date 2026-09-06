/**
 * A parent must only see their own children — not students from another
 * family or another school.
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
      parent1: { isSuperAdmin: false, schools: {} },
      parent2: { isSuperAdmin: false, schools: {} },
    },
    schools: {
      schoolA: { directorId: 'directorA' },
    },
    students: {
      schoolA: {
        childOfParent1: {
          schoolId: 'schoolA',
          firstName: 'Ada',
          parentIds: ['parent1'],
        },
        childOfParent2: {
          schoolId: 'schoolA',
          firstName: 'Zoe',
          parentIds: ['parent2'],
        },
      },
    },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as any;
    await setDoc(doc(db, 'ecoles/schoolA/eleves/childOfParent1/notes/n1'), {
      schoolId: 'schoolA',
      subject: 'Maths',
      grade: 15,
    });
    await setDoc(doc(db, 'ecoles/schoolA/eleves/childOfParent2/notes/n1'), {
      schoolId: 'schoolA',
      subject: 'Maths',
      grade: 8,
    });
  });
});

describe('parent-of-student access', () => {
  test('parent1 can read their child', async () => {
    const ctx = env.authenticatedContext('parent1');
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'ecoles/schoolA/eleves/childOfParent1')),
    );
  });

  test('parent1 cannot read another family\'s child', async () => {
    const ctx = env.authenticatedContext('parent1');
    await assertFails(
      getDoc(doc(ctx.firestore(), 'ecoles/schoolA/eleves/childOfParent2')),
    );
  });

  test('parent1 can read their child\'s grades', async () => {
    const ctx = env.authenticatedContext('parent1');
    await assertSucceeds(
      getDoc(
        doc(ctx.firestore(), 'ecoles/schoolA/eleves/childOfParent1/notes/n1'),
      ),
    );
  });

  test('parent1 cannot read grades of another child', async () => {
    const ctx = env.authenticatedContext('parent1');
    await assertFails(
      getDoc(
        doc(ctx.firestore(), 'ecoles/schoolA/eleves/childOfParent2/notes/n1'),
      ),
    );
  });
});
