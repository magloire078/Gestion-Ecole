/**
 * Privilege-escalation guards. A regular user must never be able to grant
 * themselves isSuperAdmin, nor bypass the server-only collections.
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
      superAdmin: { isSuperAdmin: true },
    },
  });
});

describe('users/{uid} privilege escalation', () => {
  test('user cannot create their doc with isSuperAdmin=true', async () => {
    const ctx = env.authenticatedContext('newUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/newUser'), {
        isSuperAdmin: true,
      }),
    );
  });

  test('user can create their own doc without isSuperAdmin flag', async () => {
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

  test('user cannot create a doc for someone else', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/otherUser'), {
        displayName: 'Bob',
      }),
    );
  });

  test('super admin can flip isSuperAdmin flag on another user', async () => {
    const ctx = env.authenticatedContext('superAdmin');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), 'users/normalUser'), {
        isSuperAdmin: true,
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

  test('mail queue: signed-in can enqueue a valid message', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'mail/test'), {
        to: 'x@y.com',
        message: { subject: 'hi', html: '<p>hi</p>' },
      }),
    );
  });

  test('mail queue: schema is enforced — missing `to` fails', async () => {
    const ctx = env.authenticatedContext('normalUser');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'mail/bad'), {
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
