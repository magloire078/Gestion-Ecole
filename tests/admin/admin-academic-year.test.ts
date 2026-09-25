/**
 * Tests d'intégration de src/lib/admin-academic-year.ts contre le VRAI SDK
 * Admin, connecté à l'emulator Firestore (FIRESTORE_EMULATOR_HOST, injecté
 * automatiquement par `firebase emulators:exec`, cf. package.json
 * "test:admin"). Contrairement à tests/services/ (faux Firestore en
 * mémoire), on veut ici de vraies transactions Firestore pour prouver que le
 * verrou anti-double-lancement tient sous concurrence réelle — un fake
 * séquentiel ne peut pas simuler une vraie course.
 *
 * Requires the Firestore emulator on 127.0.0.1:8080 (see tests/firestore-rules/README.md).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import {
  hasManageClassesPermission,
  startNewAcademicYear,
  YearTransitionConflictError,
  YearTransitionNotFoundError,
  YearTransitionValidationError,
} from '@/lib/admin-academic-year';

const PROJECT_ID = 'gerecole-admin-test';
const SCHOOL = 'schoolA';

let app: admin.app.App;
let db: Firestore;

beforeAll(() => {
  app = admin.initializeApp({ projectId: PROJECT_ID }, 'admin-academic-year-test');
  db = admin.firestore(app);
});

afterAll(async () => {
  await app.delete();
});

async function clearFirestore() {
  const res = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`clearFirestore a échoué (HTTP ${res.status})`);
}

beforeEach(async () => {
  await clearFirestore();
});

describe('hasManageClassesPermission', () => {
  test('super-admin : toujours autorisé', async () => {
    await db.doc('users/superadmin1').set({ isSuperAdmin: true });
    await expect(hasManageClassesPermission(db, 'superadmin1', SCHOOL)).resolves.toBe(true);
  });

  test('directeur explicite (school.directorId) : autorisé', async () => {
    await db.doc(`ecoles/${SCHOOL}`).set({ directorId: 'director1' });
    await expect(hasManageClassesPermission(db, 'director1', SCHOOL)).resolves.toBe(true);
  });

  test('directeur via users/{uid}.schools : autorisé', async () => {
    await db.doc(`ecoles/${SCHOOL}`).set({ directorId: 'someoneElse' });
    await db.doc('users/director2').set({ schools: { [SCHOOL]: 'directeur' } });
    await expect(hasManageClassesPermission(db, 'director2', SCHOOL)).resolves.toBe(true);
  });

  test('membre du personnel avec permission manageClasses explicite : autorisé', async () => {
    await db.doc(`ecoles/${SCHOOL}`).set({ directorId: 'someoneElse' });
    await db.doc(`ecoles/${SCHOOL}/personnel/staff1`).set({ adminRole: 'gestionnaire' });
    await db.doc(`ecoles/${SCHOOL}/admin_roles/gestionnaire`).set({ permissions: { manageClasses: true } });
    await expect(hasManageClassesPermission(db, 'staff1', SCHOOL)).resolves.toBe(true);
  });

  test('membre du personnel sans cette permission : refusé', async () => {
    await db.doc(`ecoles/${SCHOOL}`).set({ directorId: 'someoneElse' });
    await db.doc(`ecoles/${SCHOOL}/personnel/staff2`).set({ adminRole: 'cantine' });
    await db.doc(`ecoles/${SCHOOL}/admin_roles/cantine`).set({ permissions: { manageCantine: true } });
    await expect(hasManageClassesPermission(db, 'staff2', SCHOOL)).resolves.toBe(false);
  });

  test('utilisateur sans lien avec l\'école : refusé', async () => {
    await db.doc(`ecoles/${SCHOOL}`).set({ directorId: 'someoneElse' });
    await expect(hasManageClassesPermission(db, 'randomUid', SCHOOL)).resolves.toBe(false);
  });
});

describe('startNewAcademicYear', () => {
  beforeEach(async () => {
    await db.doc(`ecoles/${SCHOOL}`).set({
      name: 'École A', currentAcademicYear: '2026-2027', archivedYears: ['2025-2026'],
      academicPeriods: [{ name: 'Trimestre 1' }],
    });
    await db.doc(`ecoles/${SCHOOL}/classes/active1`).set({
      schoolId: SCHOOL, name: 'CM1 A', academicYear: '2026-2027', status: 'active', studentCount: 20, maxStudents: 30,
    });
    await db.doc(`ecoles/${SCHOOL}/classes/active2`).set({
      schoolId: SCHOOL, name: 'CM2 A', academicYear: '2026-2027', status: 'active', studentCount: 18, maxStudents: 30,
    });
  });

  test('clone les classes actives, archive les originales, bascule l\'année et lève le verrou', async () => {
    const result = await startNewAcademicYear(db, {
      schoolId: SCHOOL, toYear: '2027-2028', notes: 'Rentrée 2027', userId: 'admin1', userName: 'Mme Kouassi',
    });

    expect(result.fromYear).toBe('2026-2027');
    expect(result.cloned).toBe(2);
    expect(result.archived).toBe(2);
    expect(Object.keys(result.mapping)).toEqual(expect.arrayContaining(['active1', 'active2']));

    const oldClass = await db.doc(`ecoles/${SCHOOL}/classes/active1`).get();
    expect(oldClass.data()?.status).toBe('archived');

    const newClassId = result.mapping['active1'];
    const newClass = await db.doc(`ecoles/${SCHOOL}/classes/${newClassId}`).get();
    expect(newClass.data()).toMatchObject({
      name: 'CM1 A', academicYear: '2027-2028', status: 'active', studentCount: 0, previousClassId: 'active1',
    });

    const school = (await db.doc(`ecoles/${SCHOOL}`).get()).data();
    expect(school?.currentAcademicYear).toBe('2027-2028');
    expect(school?.archivedYears).toEqual(['2025-2026', '2026-2027']);
    expect(school?.academicPeriods).toEqual([]);
    expect(school?.yearTransition).toMatchObject({ status: 'completed', fromYear: '2026-2027', toYear: '2027-2028' });

    const transitions = await db.collection(`ecoles/${SCHOOL}/academic_year_transitions`).get();
    expect(transitions.size).toBe(1);
    expect(transitions.docs[0].data()).toMatchObject({ fromYear: '2026-2027', toYear: '2027-2028', classesCloned: 2 });

    const auditLogs = await db.collection(`ecoles/${SCHOOL}/audit_logs`).get();
    expect(auditLogs.size).toBe(1);
    expect(auditLogs.docs[0].data().action).toBe('annee_scolaire.bascule');
  });

  test('refuse un format d\'année invalide', async () => {
    await expect(startNewAcademicYear(db, {
      schoolId: SCHOOL, toYear: 'pas-une-annee', userId: 'admin1',
    })).rejects.toBeInstanceOf(YearTransitionValidationError);
  });

  test('refuse si toYear == currentAcademicYear', async () => {
    await expect(startNewAcademicYear(db, {
      schoolId: SCHOOL, toYear: '2026-2027', userId: 'admin1',
    })).rejects.toBeInstanceOf(YearTransitionValidationError);
  });

  test('refuse si l\'école est introuvable', async () => {
    await expect(startNewAcademicYear(db, {
      schoolId: 'ecoleInconnue', toYear: '2027-2028', userId: 'admin1',
    })).rejects.toBeInstanceOf(YearTransitionNotFoundError);
  });

  test('refuse si une transition est déjà en cours (verrou déjà posé)', async () => {
    await db.doc(`ecoles/${SCHOOL}`).update({
      yearTransition: { status: 'in_progress', fromYear: '2026-2027', toYear: '2027-2028', startedBy: 'autreAdmin' },
    });
    await expect(startNewAcademicYear(db, {
      schoolId: SCHOOL, toYear: '2027-2028', userId: 'admin1',
    })).rejects.toBeInstanceOf(YearTransitionConflictError);
  });

  test('deux lancements simultanés : un seul réussit, l\'autre est rejeté par le verrou (vraie course, pas une simulation séquentielle)', async () => {
    const [resA, resB] = await Promise.allSettled([
      startNewAcademicYear(db, { schoolId: SCHOOL, toYear: '2027-2028', userId: 'adminA' }),
      startNewAcademicYear(db, { schoolId: SCHOOL, toYear: '2027-2028', userId: 'adminB' }),
    ]);

    const outcomes = [resA, resB];
    const fulfilled = outcomes.filter(r => r.status === 'fulfilled');
    const rejected = outcomes.filter(r => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    // Selon le timing, le second appel est rejeté soit parce que le verrou
    // est encore 'in_progress' (ConflictError), soit parce que le premier a
    // déjà terminé et que currentAcademicYear == toYear (ValidationError) —
    // dans les deux cas l'exclusion mutuelle a tenu : un seul a réussi.
    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(
      rejectionReason instanceof YearTransitionConflictError
      || rejectionReason instanceof YearTransitionValidationError,
    ).toBe(true);

    // L'école n'a été basculée qu'une seule fois, effectif final cohérent.
    const school = (await db.doc(`ecoles/${SCHOOL}`).get()).data();
    expect(school?.currentAcademicYear).toBe('2027-2028');
    expect(school?.yearTransition?.status).toBe('completed');

    // Pas de double-clonage : exactement les 2 classes d'origine ont été
    // dupliquées vers 2027-2028, pas 4 (ce qui prouverait qu'un seul des
    // deux lancements a réellement effectué le clonage).
    const newYearClasses = await db.collection(`ecoles/${SCHOOL}/classes`)
      .where('academicYear', '==', '2027-2028')
      .get();
    expect(newYearClasses.size).toBe(2);
  });
});
