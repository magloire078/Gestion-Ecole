'use client';

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    where,
    writeBatch,
    type Firestore,
} from 'firebase/firestore';
import { firebaseFirestore } from '@/firebase/config';
import type {
    academicYearTransition,
    class_type as ClassType,
    studentClassAssignment as Assignment,
} from '@/lib/data-types';

const db = firebaseFirestore as Firestore;

export interface PromotionRule {
    studentId: string;
    fromClassId: string;
    toClassId: string;          // classe cible (déjà clonée dans la nouvelle année)
    promotionType: Assignment['promotionType'];
}

export interface CloneClassesResult {
    cloned: number;
    archived: number;
    mapping: Record<string, string>; // ancienne classe id -> nouvelle classe id
}

/**
 * Clone toutes les classes actives de `fromYear` vers `toYear`. Les anciennes
 * classes passent en `status: archived` mais conservent leurs élèves et notes
 * (la lecture historique reste possible). Les nouvelles classes sont créées
 * avec `studentCount = 0` et `status = active`.
 *
 * Retourne le mapping ancien id → nouveau id pour pouvoir promouvoir les
 * élèves immédiatement après.
 */
export async function cloneClassesForNewYear(
    schoolId: string,
    fromYear: string,
    toYear: string,
    userId: string,
): Promise<CloneClassesResult> {
    if (!schoolId || !fromYear || !toYear) {
        throw new Error('schoolId, fromYear, toYear sont requis');
    }
    if (fromYear === toYear) {
        throw new Error('La nouvelle année doit être différente de l\'année source');
    }

    const classesRef = collection(db, `ecoles/${schoolId}/classes`);
    const snap = await getDocs(query(
        classesRef,
        where('academicYear', '==', fromYear),
        where('status', '==', 'active'),
    ));

    if (snap.empty) {
        return { cloned: 0, archived: 0, mapping: {} };
    }

    const batch = writeBatch(db);
    const mapping: Record<string, string> = {};
    let cloned = 0;
    let archived = 0;

    for (const oldDoc of snap.docs) {
        const oldData = oldDoc.data() as ClassType;
        const newRef = doc(classesRef);
        const { id: _ignored, createdAt: _c, updatedAt: _u, ...payload } = oldData as any;
        batch.set(newRef, {
            ...payload,
            schoolId,
            academicYear: toYear,
            studentCount: 0,
            status: 'active',
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            previousClassId: oldDoc.id,
        });
        mapping[oldDoc.id] = newRef.id;
        cloned += 1;

        batch.update(oldDoc.ref, {
            status: 'archived',
            updatedAt: serverTimestamp(),
        });
        archived += 1;
    }

    await batch.commit();
    return { cloned, archived, mapping };
}

export interface PromoteStudentsResult {
    promoted: number;
    skipped: number;
    errors: { studentId: string; reason: string }[];
}

/**
 * Crée une nouvelle `studentClassAssignment` pour chaque élève listé,
 * en clôturant l'affectation précédente (`status: transferred`,
 * `endDate: today`).
 */
export async function promoteStudents(
    schoolId: string,
    rules: PromotionRule[],
    toYear: string,
    userId: string,
): Promise<PromoteStudentsResult> {
    const result: PromoteStudentsResult = { promoted: 0, skipped: 0, errors: [] };
    if (!rules.length) return result;

    const today = new Date().toISOString().split('T')[0];
    const assignmentsRef = collection(db, `ecoles/${schoolId}/inscriptions_classe`);

    // Firestore batch max = 500 ops. Chaque élève = 2 ops (clôture + création) + 1 update élève.
    const CHUNK = 150;
    for (let i = 0; i < rules.length; i += CHUNK) {
        const chunk = rules.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        for (const rule of chunk) {
            try {
                // Fermer l'ancienne affectation active sur fromClassId
                const oldAssignSnap = await getDocs(query(
                    assignmentsRef,
                    where('studentId', '==', rule.studentId),
                    where('classeId', '==', rule.fromClassId),
                    where('status', '==', 'active'),
                ));
                oldAssignSnap.docs.forEach(oldDoc => {
                    batch.update(oldDoc.ref, {
                        status: 'transferred',
                        endDate: today,
                    });
                });

                const newAssignRef = doc(assignmentsRef);
                batch.set(newAssignRef, {
                    schoolId,
                    studentId: rule.studentId,
                    classeId: rule.toClassId,
                    academicYear: toYear,
                    startDate: today,
                    promotionType: rule.promotionType,
                    status: 'active',
                    previousClass: rule.fromClassId,
                    createdBy: userId,
                    createdAt: serverTimestamp(),
                });

                batch.update(doc(db, `ecoles/${schoolId}/eleves/${rule.studentId}`), {
                    currentClassId: rule.toClassId,
                    updatedAt: serverTimestamp(),
                });
                result.promoted += 1;
            } catch (err: any) {
                result.errors.push({ studentId: rule.studentId, reason: err?.message ?? 'unknown' });
                result.skipped += 1;
            }
        }
        await batch.commit();
    }

    return result;
}

/**
 * Finalise la transition : pose la nouvelle année comme année courante
 * sur l'école et archive l'ancienne dans `archivedYears`.
 */
export async function finalizeAcademicYear(
    schoolId: string,
    fromYear: string,
    toYear: string,
    summary: Pick<academicYearTransition, 'classesCloned' | 'studentsPromoted' | 'notes'>,
    userId: string,
): Promise<void> {
    const schoolRef = doc(db, `ecoles/${schoolId}`);
    const schoolSnap = await getDoc(schoolRef);
    if (!schoolSnap.exists()) throw new Error('École introuvable');

    const data = schoolSnap.data();
    const archived: string[] = Array.isArray(data?.archivedYears) ? data.archivedYears : [];
    if (!archived.includes(fromYear)) archived.push(fromYear);

    const batch = writeBatch(db);
    batch.update(schoolRef, {
        currentAcademicYear: toYear,
        archivedYears: archived,
        academicPeriods: [],
        updatedAt: serverTimestamp(),
    });

    const transitionRef = doc(collection(db, `ecoles/${schoolId}/academic_year_transitions`));
    batch.set(transitionRef, {
        schoolId,
        fromYear,
        toYear,
        status: 'completed',
        classesCloned: summary.classesCloned,
        studentsPromoted: summary.studentsPromoted,
        startedBy: userId,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        notes: summary.notes ?? '',
    } satisfies academicYearTransition);

    await batch.commit();
}

export const AcademicYearService = {
    cloneClassesForNewYear,
    promoteStudents,
    finalizeAcademicYear,
};
