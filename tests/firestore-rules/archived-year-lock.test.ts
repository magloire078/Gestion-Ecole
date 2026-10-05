/**
 * Verrou sur les années archivées — une classe ou une affectation
 * (inscriptions_classe) dont l'academicYear n'est plus l'année courante de
 * l'école ne doit plus pouvoir être modifiée arbitrairement (nom, capacité,
 * élève/classe d'une affectation…), même par un utilisateur qui a la
 * permission `manageClasses`.
 *
 * Les flux de promotion/annulation (academic-year-service.ts,
 * class-assignment-service.ts) doivent en revanche continuer à fonctionner :
 * ils ne touchent jamais, sur un document archivé, que `studentCount`/
 * `status`/`updatedAt` (classes) ou `status`/`endDate` (inscriptions_classe).
 *
 * Requires the Firestore emulator on 127.0.0.1:8080 (see README / npm script).
 */
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { seed, setupEnv } from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await setupEnv();
});

afterAll(async () => {
  await env.cleanup();
});

const SCHOOL_ID = 'schoolA';
const CURRENT_YEAR = '2026-2027';
const ARCHIVED_YEAR = '2025-2026';

beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    users: {
      director1: { isSuperAdmin: false, schools: { [SCHOOL_ID]: 'directeur' } },
    },
    schools: {
      [SCHOOL_ID]: {
        directorId: 'director1',
        name: 'École A',
        currentAcademicYear: CURRENT_YEAR,
        archivedYears: [ARCHIVED_YEAR],
      },
    },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as any;
    await setDoc(doc(db, `ecoles/${SCHOOL_ID}/classes/archivedClass`), {
      schoolId: SCHOOL_ID,
      name: 'CM2 A',
      academicYear: ARCHIVED_YEAR,
      status: 'archived',
      studentCount: 10,
      maxStudents: 30,
    });
    await setDoc(doc(db, `ecoles/${SCHOOL_ID}/classes/currentClass`), {
      schoolId: SCHOOL_ID,
      name: 'CM2 A',
      academicYear: CURRENT_YEAR,
      status: 'active',
      studentCount: 0,
      maxStudents: 30,
    });
    await setDoc(doc(db, `ecoles/${SCHOOL_ID}/inscriptions_classe/archivedAssignment`), {
      schoolId: SCHOOL_ID,
      studentId: 'student1',
      classeId: 'archivedClass',
      academicYear: ARCHIVED_YEAR,
      status: 'transferred',
      startDate: '2025-09-01',
      endDate: '2026-09-01',
    });
    await setDoc(doc(db, `ecoles/${SCHOOL_ID}/inscriptions_classe/currentAssignment`), {
      schoolId: SCHOOL_ID,
      studentId: 'student1',
      classeId: 'currentClass',
      academicYear: CURRENT_YEAR,
      status: 'active',
      startDate: '2026-09-01',
    });
  });
});

describe('classes — verrou année archivée', () => {
  test('studentCount reste modifiable sur une classe archivée (décrément de promotion)', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertSucceeds(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/classes/archivedClass`),
      { studentCount: 9 },
    ));
  });

  test('status/updatedAt restent modifiables sur une classe archivée (archivage)', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertSucceeds(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/classes/archivedClass`),
      { status: 'archived', updatedAt: '2026-09-01' },
    ));
  });

  test('le nom d\'une classe archivée n\'est plus modifiable', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertFails(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/classes/archivedClass`),
      { name: 'CM2 B (renommée après coup)' },
    ));
  });

  test('la capacité d\'une classe archivée n\'est plus modifiable', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertFails(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/classes/archivedClass`),
      { maxStudents: 40 },
    ));
  });

  test('une classe de l\'année courante reste librement modifiable (non régression)', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertSucceeds(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/classes/currentClass`),
      { name: 'CM2 B', maxStudents: 35, studentCount: 12 },
    ));
  });
});

describe('inscriptions_classe — verrou année archivée', () => {
  test('status/endDate restent modifiables sur une affectation archivée (annulation/réouverture)', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertSucceeds(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/inscriptions_classe/archivedAssignment`),
      { status: 'active', endDate: null },
    ));
  });

  test('classeId d\'une affectation archivée n\'est plus modifiable', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertFails(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/inscriptions_classe/archivedAssignment`),
      { classeId: 'uneAutreClasse' },
    ));
  });

  test('studentId d\'une affectation archivée n\'est plus modifiable', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertFails(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/inscriptions_classe/archivedAssignment`),
      { studentId: 'unAutreEleve' },
    ));
  });

  test('une affectation de l\'année courante reste librement modifiable (non régression)', async () => {
    const ctx = env.authenticatedContext('director1');
    await assertSucceeds(updateDoc(
      doc(ctx.firestore(), `ecoles/${SCHOOL_ID}/inscriptions_classe/currentAssignment`),
      { classeId: 'archivedClass', promotionType: 'redoublement' },
    ));
  });
});
