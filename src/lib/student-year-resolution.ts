import type { student as Student } from '@/lib/data-types';

/**
 * Résout les champs d'un élève pour l'année demandée.
 *
 * - Année courante (ou pas de filtre) : les champs racine de l'élève
 *   (`classId`, `status`, etc., tenus à jour par class-assignment-service)
 *   sont la source de vérité — retournés tels quels.
 * - Année révolue : reconstruction best-effort via `student.enrollments[]`
 *   (instantané écrit une seule fois à la création, jamais mis à jour sur
 *   promotion). Un élève sans entrée pour cette année-là est exclu
 *   (`null`).
 *
 * Fonction pure (pas de dépendance React/Firestore) utilisée par
 * `useStudents` — extraite ici pour être testable sans monter de composant.
 */
export function resolveStudentForYear(
    student: Student,
    effectiveYear: string | null | undefined,
    isHistoricalYear: boolean,
): Student | null {
    if (!isHistoricalYear) return student;

    const enrollments = student.enrollments || [];
    const enrollment = enrollments.find(e => e.academicYear === effectiveYear);
    if (!enrollment) return null;

    return {
        ...student,
        classId: enrollment.classId,
        tuitionFee: enrollment.tuitionFee,
        amountDue: enrollment.amountDue,
        tuitionStatus: enrollment.tuitionStatus as any,
        status: enrollment.status === 'Radié' || enrollment.status === 'Transféré' ? 'Radié' : 'Actif',
    };
}
