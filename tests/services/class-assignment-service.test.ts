/**
 * Tests unitaires de class-assignment-service.ts — le point d'écriture unique
 * de la relation élève↔classe (cf. commit "unifier attribution/promotion de
 * classe sur inscriptions_classe"). Utilise un faux Firestore en mémoire
 * (tests/helpers/fake-firestore.ts) : aucun emulator, aucune authentification
 * — les règles de sécurité sont testées séparément dans tests/firestore-rules/.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('firebase/firestore', async () => import('../helpers/fake-firestore'));
vi.mock('@/firebase/config', () => ({ firebaseFirestore: {} }));

import { __store } from '../helpers/fake-firestore';
import {
  assignStudentsToClass,
  promoteStudentsToClasses,
  revertClassAssignment,
} from '@/services/class-assignment-service';

const SCHOOL = 'schoolA';

function path(...segments: string[]) {
  return segments.join('/');
}

beforeEach(() => {
  __store.reset({
    [path('ecoles', SCHOOL, 'eleves', 'student1')]: {
      schoolId: SCHOOL, firstName: 'Ali', lastName: 'K', classId: 'classA', class: 'CM1 A',
    },
    [path('ecoles', SCHOOL, 'classes', 'classA')]: {
      schoolId: SCHOOL, name: 'CM1 A', academicYear: '2026-2027', studentCount: 10,
    },
    [path('ecoles', SCHOOL, 'classes', 'classB')]: {
      schoolId: SCHOOL, name: 'CM1 B', academicYear: '2026-2027', studentCount: 5,
    },
    [path('ecoles', SCHOOL, 'inscriptions_classe', 'assign1')]: {
      schoolId: SCHOOL, studentId: 'student1', classeId: 'classA', className: 'CM1 A',
      academicYear: '2026-2027', status: 'active', startDate: '2026-09-01',
    },
  });
});

describe('assignStudentsToClass', () => {
  test('réaffecte un élève : clôture l\'ancienne affectation, en crée une nouvelle, synchronise classId/class et les effectifs', async () => {
    const result = await assignStudentsToClass({
      schoolId: SCHOOL,
      studentIds: ['student1'],
      toClassId: 'classB',
      toClassName: 'CM1 B',
      academicYear: '2026-2027',
      userId: 'admin1',
      reason: 'Correction',
    });

    expect(result.assigned).toBe(1);
    expect(result.unchanged).toBe(0);
    expect(result.auditLogId).not.toBeNull();

    const dump = __store.dump();
    expect(dump[path('ecoles', SCHOOL, 'inscriptions_classe', 'assign1')].status).toBe('transferred');
    expect(dump[path('ecoles', SCHOOL, 'eleves', 'student1')].classId).toBe('classB');
    expect(dump[path('ecoles', SCHOOL, 'eleves', 'student1')].class).toBe('CM1 B');
    expect(dump[path('ecoles', SCHOOL, 'classes', 'classA')].studentCount).toBe(9); // 10 - 1
    expect(dump[path('ecoles', SCHOOL, 'classes', 'classB')].studentCount).toBe(6); // 5 + 1

    // La nouvelle affectation active existe et pointe vers classB.
    const newActive = Object.entries(dump).find(([k, v]: [string, any]) =>
      k.startsWith(path('ecoles', SCHOOL, 'inscriptions_classe')) && v.classeId === 'classB' && v.status === 'active');
    expect(newActive).toBeDefined();

    // Le journal d'audit reflète l'opération.
    const auditEntries = Object.entries(dump).filter(([k]) => k.startsWith(path('ecoles', SCHOOL, 'audit_logs')));
    expect(auditEntries).toHaveLength(1);
    const [, auditData] = auditEntries[0] as [string, any];
    expect(auditData.action).toBe('eleves.attribution_classe');
    expect(auditData.payload.entries).toHaveLength(1);
    expect(auditData.payload.entries[0]).toMatchObject({
      studentId: 'student1', fromClassId: 'classA', toClassId: 'classB',
    });
  });

  test('ne fait rien si l\'élève est déjà dans la classe cible pour cette année (dédoublonnage)', async () => {
    const result = await assignStudentsToClass({
      schoolId: SCHOOL,
      studentIds: ['student1'],
      toClassId: 'classA', // déjà sa classe actuelle
      toClassName: 'CM1 A',
      academicYear: '2026-2027',
      userId: 'admin1',
    });

    expect(result.assigned).toBe(0);
    expect(result.unchanged).toBe(1);
    expect(result.auditLogId).toBeNull(); // aucune entrée -> pas de journal

    const dump = __store.dump();
    // L'affectation existante reste active, aucun nouveau doc créé.
    expect(dump[path('ecoles', SCHOOL, 'inscriptions_classe', 'assign1')].status).toBe('active');
    expect(dump[path('ecoles', SCHOOL, 'classes', 'classA')].studentCount).toBe(10); // inchangé
  });

  test('ne fait rien sans studentIds', async () => {
    const result = await assignStudentsToClass({
      schoolId: SCHOOL, studentIds: [], toClassId: 'classB', toClassName: 'CM1 B',
      academicYear: '2026-2027', userId: 'admin1',
    });
    expect(result).toEqual({ assigned: 0, unchanged: 0, auditLogId: null });
  });
});

describe('promoteStudentsToClasses', () => {
  test('promeut un élève vers l\'année suivante et journalise l\'opération', async () => {
    const result = await promoteStudentsToClasses(
      SCHOOL,
      [{ studentId: 'student1', fromClassId: 'classA', toClassId: 'classB', toClassName: 'CM1 B', promotionType: 'normal' }],
      '2027-2028',
      'admin1',
      'Mme Kouassi',
    );

    expect(result.promoted).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);

    const dump = __store.dump();
    expect(dump[path('ecoles', SCHOOL, 'eleves', 'student1')].classId).toBe('classB');
    expect(dump[path('ecoles', SCHOOL, 'inscriptions_classe', 'assign1')].status).toBe('transferred');

    const auditEntries = Object.entries(dump).filter(([k]) => k.startsWith(path('ecoles', SCHOOL, 'audit_logs')));
    expect(auditEntries).toHaveLength(1);
    expect((auditEntries[0][1] as any).action).toBe('eleves.promotion_classe');
  });

  test('ne fait rien avec une liste de règles vide', async () => {
    const result = await promoteStudentsToClasses(SCHOOL, [], '2027-2028', 'admin1');
    expect(result).toEqual({ promoted: 0, skipped: 0, errors: [], auditLogId: null });
  });
});

describe('revertClassAssignment', () => {
  test('annule une réaffectation : réactive l\'ancienne affectation et restaure les effectifs', async () => {
    const { auditLogId } = await assignStudentsToClass({
      schoolId: SCHOOL, studentIds: ['student1'], toClassId: 'classB', toClassName: 'CM1 B',
      academicYear: '2026-2027', userId: 'admin1',
    });
    expect(auditLogId).not.toBeNull();

    const { reverted } = await revertClassAssignment(SCHOOL, auditLogId as string, 'admin2');
    expect(reverted).toBe(1);

    const dump = __store.dump();
    expect(dump[path('ecoles', SCHOOL, 'eleves', 'student1')].classId).toBe('classA');
    expect(dump[path('ecoles', SCHOOL, 'inscriptions_classe', 'assign1')].status).toBe('active');
    expect(dump[path('ecoles', SCHOOL, 'classes', 'classA')].studentCount).toBe(10); // restauré
    expect(dump[path('ecoles', SCHOOL, 'classes', 'classB')].studentCount).toBe(5); // restauré
    expect(dump[path('ecoles', SCHOOL, 'audit_logs', auditLogId as string)].reverted).toBe(true);
  });

  test('refuse d\'annuler deux fois la même opération', async () => {
    const { auditLogId } = await assignStudentsToClass({
      schoolId: SCHOOL, studentIds: ['student1'], toClassId: 'classB', toClassName: 'CM1 B',
      academicYear: '2026-2027', userId: 'admin1',
    });
    await revertClassAssignment(SCHOOL, auditLogId as string, 'admin2');
    await expect(revertClassAssignment(SCHOOL, auditLogId as string, 'admin2')).rejects.toThrow();
  });

  test('refuse d\'annuler un journal introuvable', async () => {
    await expect(revertClassAssignment(SCHOOL, 'inexistant', 'admin2')).rejects.toThrow();
  });
});
