/**
 * Régression : `resolveStudentForYear` (extrait de useStudents) ne doit PAS
 * exclure un élève de l'année courante au seul motif que son
 * `enrollments[]` (instantané écrit une fois à la création, jamais mis à
 * jour sur promotion/changement de classe depuis l'unification sur
 * `inscriptions_classe`) n'a pas d'entrée pour cette année — sinon tout
 * élève déjà promu une fois disparaît silencieusement des listes
 * (Dossiers Élèves, tableau de bord, rapports de paiement, etc.).
 */
import { describe, expect, test } from 'vitest';
import { resolveStudentForYear } from '@/lib/student-year-resolution';
import type { student as Student } from '@/lib/data-types';

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 's1',
    firstName: 'Awa',
    lastName: 'Koné',
    classId: 'classe-cm2-live',
    status: 'Actif',
    ...overrides,
  } as Student;
}

describe('resolveStudentForYear', () => {
  test('année courante, sans enrollments : conserve les champs racine (classId, status)', () => {
    const student = makeStudent({ enrollments: undefined });
    const result = resolveStudentForYear(student, '2026-2027', /* isHistoricalYear */ false);
    expect(result).not.toBeNull();
    expect(result?.classId).toBe('classe-cm2-live');
    expect(result?.status).toBe('Actif');
  });

  test('année courante, enrollments[] périmé (créé il y a 2 ans, jamais mis à jour) : élève quand même inclus', () => {
    const student = makeStudent({
      classId: 'classe-cm2-live',
      enrollments: [{ academicYear: '2024-2025', classId: 'classe-cp-ancienne', status: 'Nouveau' } as any],
    });
    const result = resolveStudentForYear(student, '2026-2027', false);
    expect(result).not.toBeNull();
    expect(result?.classId).toBe('classe-cm2-live');
  });

  test('année révolue avec une entrée enrollments correspondante : reconstruction depuis l\'instantané', () => {
    const student = makeStudent({
      classId: 'classe-cm2-live',
      enrollments: [{ academicYear: '2024-2025', classId: 'classe-cp-ancienne', status: 'Nouveau', tuitionFee: 1000, amountDue: 200, tuitionStatus: 'Partiel' } as any],
    });
    const result = resolveStudentForYear(student, '2024-2025', /* isHistoricalYear */ true);
    expect(result).not.toBeNull();
    expect(result?.classId).toBe('classe-cp-ancienne');
    expect(result?.status).toBe('Actif');
  });

  test('année révolue sans entrée enrollments correspondante : exclu (best-effort assumé)', () => {
    const student = makeStudent({ enrollments: [] });
    const result = resolveStudentForYear(student, '2023-2024', true);
    expect(result).toBeNull();
  });

  test('pas de filtre d\'année (undefined/null) : conserve les champs racine', () => {
    const student = makeStudent();
    expect(resolveStudentForYear(student, null, false)).not.toBeNull();
    expect(resolveStudentForYear(student, undefined, false)?.classId).toBe('classe-cm2-live');
  });
});
