/**
 * Tests unitaires de academic-year-service.ts (cloneClassesForNewYear,
 * finalizeAcademicYear) — même faux Firestore que class-assignment-service
 * (promoteStudents y délègue désormais entièrement, déjà testé là-bas).
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('firebase/firestore', async () => import('../helpers/fake-firestore'));
vi.mock('@/firebase/config', () => ({ firebaseFirestore: {} }));

import { __store } from '../helpers/fake-firestore';
import { cloneClassesForNewYear, finalizeAcademicYear } from '@/services/academic-year-service';

const SCHOOL = 'schoolA';

function path(...segments: string[]) {
  return segments.join('/');
}

describe('cloneClassesForNewYear', () => {
  beforeEach(() => {
    __store.reset({
      [path('ecoles', SCHOOL, 'classes', 'active1')]: {
        schoolId: SCHOOL, name: 'CM1 A', academicYear: '2026-2027', status: 'active', studentCount: 20, maxStudents: 30,
      },
      [path('ecoles', SCHOOL, 'classes', 'active2')]: {
        schoolId: SCHOOL, name: 'CM2 A', academicYear: '2026-2027', status: 'active', studentCount: 18, maxStudents: 30,
      },
      [path('ecoles', SCHOOL, 'classes', 'alreadyArchived')]: {
        schoolId: SCHOOL, name: 'CE1 A (vieille)', academicYear: '2026-2027', status: 'archived', studentCount: 0,
      },
      [path('ecoles', SCHOOL, 'classes', 'otherYear')]: {
        schoolId: SCHOOL, name: 'CM1 A', academicYear: '2025-2026', status: 'active', studentCount: 0,
      },
    });
  });

  test('clone uniquement les classes actives de l\'année source, archive les originales', async () => {
    const result = await cloneClassesForNewYear(SCHOOL, '2026-2027', '2027-2028', 'admin1');

    expect(result.cloned).toBe(2);
    expect(result.archived).toBe(2);
    expect(Object.keys(result.mapping)).toEqual(expect.arrayContaining(['active1', 'active2']));

    const dump = __store.dump();
    // Les deux originales sont archivées, pas touchées autrement.
    expect(dump[path('ecoles', SCHOOL, 'classes', 'active1')].status).toBe('archived');
    expect(dump[path('ecoles', SCHOOL, 'classes', 'active2')].status).toBe('archived');
    // Les classes hors périmètre (déjà archivée, autre année) ne sont pas touchées.
    expect(dump[path('ecoles', SCHOOL, 'classes', 'alreadyArchived')].status).toBe('archived');
    expect(dump[path('ecoles', SCHOOL, 'classes', 'otherYear')].status).toBe('active');

    // Les clones existent, avec studentCount remis à 0 et le lien vers l'ancienne classe.
    const newActive1Path = result.mapping['active1'];
    const clone1 = dump[path('ecoles', SCHOOL, 'classes', newActive1Path)];
    expect(clone1).toMatchObject({
      name: 'CM1 A', academicYear: '2027-2028', status: 'active', studentCount: 0, previousClassId: 'active1',
    });
  });

  test('ne fait rien si aucune classe active pour l\'année source', async () => {
    __store.reset({});
    const result = await cloneClassesForNewYear(SCHOOL, '2026-2027', '2027-2028', 'admin1');
    expect(result).toEqual({ cloned: 0, archived: 0, mapping: {} });
  });

  test('refuse si fromYear == toYear', async () => {
    await expect(cloneClassesForNewYear(SCHOOL, '2026-2027', '2026-2027', 'admin1')).rejects.toThrow();
  });

  test('refuse si un paramètre requis manque', async () => {
    await expect(cloneClassesForNewYear('', '2026-2027', '2027-2028', 'admin1')).rejects.toThrow();
  });
});

describe('finalizeAcademicYear', () => {
  beforeEach(() => {
    __store.reset({
      [path('ecoles', SCHOOL)]: {
        name: 'École A', currentAcademicYear: '2026-2027', archivedYears: ['2025-2026'],
        academicPeriods: [{ name: 'Trimestre 1' }],
      },
    });
  });

  test('bascule l\'année courante, archive l\'ancienne, vide les périodes et journalise la transition', async () => {
    await finalizeAcademicYear(SCHOOL, '2026-2027', '2027-2028', {
      classesCloned: 5, studentsPromoted: 0, notes: 'Rentrée 2027',
    }, 'admin1', 'Mme Kouassi');

    const dump = __store.dump();
    const school = dump[path('ecoles', SCHOOL)];
    expect(school.currentAcademicYear).toBe('2027-2028');
    expect(school.archivedYears).toEqual(['2025-2026', '2026-2027']);
    expect(school.academicPeriods).toEqual([]);

    const transitions = Object.entries(dump).filter(([k]) => k.startsWith(path('ecoles', SCHOOL, 'academic_year_transitions')));
    expect(transitions).toHaveLength(1);
    const [, transitionData] = transitions[0] as [string, any];
    expect(transitionData).toMatchObject({
      schoolId: SCHOOL, fromYear: '2026-2027', toYear: '2027-2028', status: 'completed',
      classesCloned: 5, studentsPromoted: 0, startedBy: 'admin1',
    });

    const auditEntries = Object.entries(dump).filter(([k]) => k.startsWith(path('ecoles', SCHOOL, 'audit_logs')));
    expect(auditEntries).toHaveLength(1);
    expect((auditEntries[0][1] as any).action).toBe('annee_scolaire.bascule');
  });

  test('n\'ajoute pas de doublon si fromYear est déjà dans archivedYears', async () => {
    __store.set(path('ecoles', SCHOOL), {
      name: 'École A', currentAcademicYear: '2026-2027', archivedYears: ['2025-2026', '2026-2027'],
    });
    await finalizeAcademicYear(SCHOOL, '2026-2027', '2027-2028', {
      classesCloned: 0, studentsPromoted: 0, notes: '',
    }, 'admin1');

    const school = __store.dump()[path('ecoles', SCHOOL)];
    expect(school.archivedYears).toEqual(['2025-2026', '2026-2027']);
  });

  test('refuse si l\'école est introuvable', async () => {
    await expect(finalizeAcademicYear('ecoleInconnue', '2026-2027', '2027-2028', {
      classesCloned: 0, studentsPromoted: 0, notes: '',
    }, 'admin1')).rejects.toThrow();
  });
});
