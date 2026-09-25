'use client';

import {
    collection,
    doc,
    getDocs,
    increment,
    query,
    serverTimestamp,
    where,
    writeBatch,
    type Firestore,
    type WriteBatch,
} from 'firebase/firestore';
import { firebaseFirestore } from '@/firebase/config';
import type { studentClassAssignment as Assignment } from '@/lib/data-types';

const db = firebaseFirestore as Firestore;

export interface AssignStudentToClassParams {
    studentId: string;
    toClassId: string;
    academicYear: string;
    promotionType: Assignment['promotionType'];
    userId: string;
    /**
     * Classe source si elle est déjà connue de l'appelant (évite une lecture).
     * Si omise, on recherche toute affectation `active` existante pour cet
     * élève et on la clôture (utile quand l'ancienne classe n'est pas connue
     * à l'appel, ex: import en masse).
     */
    fromClassId?: string;
    /** Champs dénormalisés de la classe cible, écrits sur le document élève. */
    toClassName?: string;
    toGrade?: string;
    toCycleId?: string;
    /**
     * Décrémenter `studentCount` sur la classe source. À mettre à `false`
     * quand la classe source est déjà archivée (ex: promotion de fin
     * d'année) : son effectif doit rester un instantané historique, pas
     * redescendre vers 0 au fil des promotions. Par défaut `true` (cas d'un
     * changement de classe en cours d'année, classe source toujours active).
     */
    decrementSourceCount?: boolean;
}

export interface AssignStudentToClassResult {
    assignmentId: string;
    fromClassId?: string;
}

/**
 * Point d'écriture UNIQUE pour toute affectation d'un élève à une classe :
 * inscription initiale, changement manuel en cours d'année, ou promotion de
 * fin d'année. Clôture l'affectation `active` précédente dans
 * `inscriptions_classe` (status: 'transferred'), en crée une nouvelle, et
 * tient `student.classId` (+ class/cycle/grade dénormalisés) et
 * `studentCount` synchronisés.
 *
 * Si `externalBatch` est fourni, les écritures y sont ajoutées et c'est à
 * l'appelant de commit (utile pour composer avec d'autres écritures dans le
 * même batch, ex: création de l'élève, ou promotion en masse par lots).
 * Sinon, un batch dédié est créé et commité ici.
 */
export async function assignStudentToClass(
    schoolId: string,
    params: AssignStudentToClassParams,
    externalBatch?: WriteBatch,
): Promise<AssignStudentToClassResult> {
    const {
        studentId, toClassId, academicYear, promotionType, userId,
        fromClassId, toClassName, toGrade, toCycleId,
        decrementSourceCount = true,
    } = params;

    const batch = externalBatch ?? writeBatch(db);
    const today = new Date().toISOString().split('T')[0];
    const assignmentsRef = collection(db, `ecoles/${schoolId}/inscriptions_classe`);

    // Clôture la (ou les) affectation(s) active(s) existante(s).
    const activeQuery = fromClassId
        ? query(
            assignmentsRef,
            where('studentId', '==', studentId),
            where('classeId', '==', fromClassId),
            where('status', '==', 'active'),
        )
        : query(
            assignmentsRef,
            where('studentId', '==', studentId),
            where('status', '==', 'active'),
        );
    const activeSnap = await getDocs(activeQuery);
    let resolvedFromClassId = fromClassId;
    activeSnap.docs.forEach(activeDoc => {
        batch.update(activeDoc.ref, { status: 'transferred', endDate: today });
        if (!resolvedFromClassId) {
            resolvedFromClassId = (activeDoc.data() as Assignment).classeId;
        }
    });

    // Nouvelle affectation active.
    const newAssignRef = doc(assignmentsRef);
    batch.set(newAssignRef, {
        schoolId,
        studentId,
        classeId: toClassId,
        academicYear,
        startDate: today,
        promotionType,
        status: 'active',
        previousClass: resolvedFromClassId ?? null,
        createdBy: userId,
        createdAt: serverTimestamp(),
    });

    // Document élève : classe courante + cache dénormalisé (même convention
    // que student-edit-form.tsx pour un changement de classe manuel).
    batch.update(doc(db, `ecoles/${schoolId}/eleves/${studentId}`), {
        classId: toClassId,
        ...(toClassName ? { class: toClassName } : {}),
        ...(toCycleId ? { cycle: toCycleId } : {}),
        ...(toGrade ? { grade: toGrade } : {}),
        updatedAt: serverTimestamp(),
    });

    // Effectifs des classes.
    batch.update(doc(db, `ecoles/${schoolId}/classes/${toClassId}`), {
        studentCount: increment(1),
    });
    if (resolvedFromClassId && decrementSourceCount) {
        batch.update(doc(db, `ecoles/${schoolId}/classes/${resolvedFromClassId}`), {
            studentCount: increment(-1),
        });
    }

    if (!externalBatch) {
        await batch.commit();
    }

    return { assignmentId: newAssignRef.id, fromClassId: resolvedFromClassId };
}

export const ClassAssignmentService = {
    assignStudentToClass,
};
