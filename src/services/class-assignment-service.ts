'use client';

/**
 * Source unique de logique pour tout ce qui déplace un élève d'une classe à
 * une autre : attribution manuelle en lot (correction, réaffectation) et
 * promotion de fin d'année. Les deux écritures partagent le même mécanisme :
 *
 *   - `inscriptions_classe` reste la source de vérité historique (une
 *     affectation `active` par élève/année, clôturée en `transferred` quand
 *     on la remplace).
 *   - `eleves/{id}.classId` / `.class` restent synchronisés pour les écrans
 *     qui lisent directement le document élève.
 *   - Chaque opération écrit une entrée dans `audit_logs` avec assez
 *     d'information (`payload.entries`) pour être annulée via
 *     `revertClassAssignment`.
 */
import {
    collection,
    deleteField,
    doc,
    getDoc,
    getDocs,
    increment,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
    type Firestore,
    type WriteBatch,
} from 'firebase/firestore';
import { firebaseFirestore } from '@/firebase/config';
import type {
    audit_log,
    studentClassAssignment as Assignment,
} from '@/lib/data-types';

const db = firebaseFirestore as Firestore;

const CHUNK_SIZE = 100;

export interface ClassAssignmentEntry {
    studentId: string;
    previousAssignmentId: string | null;
    fromClassId: string | null;
    fromClassName: string | null;
    toClassId: string;
    toClassName: string;
    newAssignmentId: string;
}

export interface ClassAssignmentAuditPayload {
    academicYear: string;
    entries: ClassAssignmentEntry[];
}

async function closeAndCreateAssignment(
    batch: WriteBatch,
    schoolId: string,
    studentId: string,
    toAcademicYear: string,
    toClassId: string,
    toClassName: string,
    promotionType: Assignment['promotionType'],
    userId: string,
    reason: string | undefined,
    opts: { fromAcademicYear?: string; filterFromClassId?: string } = {},
): Promise<ClassAssignmentEntry | null> {
    const assignmentsRef = collection(db, `ecoles/${schoolId}/inscriptions_classe`);
    const constraints = [
        where('studentId', '==', studentId),
        where('status', '==', 'active'),
    ];
    if (opts.fromAcademicYear) constraints.push(where('academicYear', '==', opts.fromAcademicYear));
    if (opts.filterFromClassId) constraints.push(where('classeId', '==', opts.filterFromClassId));

    const activeSnap = await getDocs(query(assignmentsRef, ...constraints));

    let previousAssignmentId: string | null = null;
    let fromClassId: string | null = null;
    let fromClassName: string | null = null;
    const today = new Date().toISOString().split('T')[0];

    activeSnap.docs.forEach(activeDoc => {
        const data = activeDoc.data() as Assignment;
        previousAssignmentId = activeDoc.id;
        fromClassId = data.classeId ?? null;
        fromClassName = data.className ?? null;
        batch.update(activeDoc.ref, { status: 'transferred', endDate: today });
    });

    if (fromClassId === toClassId && previousAssignmentId) {
        // Déjà dans la classe cible pour cette période : on annule la clôture
        // qu'on vient de préparer et on ne fait rien de plus.
        batch.update(doc(assignmentsRef, previousAssignmentId), { status: 'active', endDate: deleteField() });
        return null;
    }

    const newAssignRef = doc(assignmentsRef);
    batch.set(newAssignRef, {
        schoolId,
        studentId,
        classeId: toClassId,
        className: toClassName,
        academicYear: toAcademicYear,
        startDate: today,
        promotionType,
        status: 'active',
        createdBy: userId,
        createdAt: serverTimestamp(),
        ...(fromClassId ? { previousClass: fromClassId } : {}),
        ...(reason ? { notes: reason } : {}),
    });

    batch.update(doc(db, `ecoles/${schoolId}/eleves/${studentId}`), {
        classId: toClassId,
        class: toClassName,
        updatedAt: today,
    });

    return {
        studentId,
        previousAssignmentId,
        fromClassId,
        fromClassName,
        toClassId,
        toClassName,
        newAssignmentId: newAssignRef.id,
    };
}

async function applyClassCountDeltas(schoolId: string, deltas: Record<string, number>): Promise<void> {
    const changed = Object.entries(deltas).filter(([, delta]) => delta !== 0);
    if (changed.length === 0) return;
    const batch = writeBatch(db);
    for (const [classId, delta] of changed) {
        batch.update(doc(db, `ecoles/${schoolId}/classes/${classId}`), { studentCount: increment(delta) });
    }
    await batch.commit();
}

interface WriteAuditLogParams {
    schoolId: string;
    action: string;
    details: string;
    userId: string;
    userName?: string;
    userRole?: string;
    targetId?: string;
    targetType?: string;
    payload: ClassAssignmentAuditPayload;
}

async function writeClassAssignmentAuditLog(params: WriteAuditLogParams): Promise<string | null> {
    if (params.payload.entries.length === 0) return null;
    const logRef = doc(collection(db, `ecoles/${params.schoolId}/audit_logs`));
    const logData: audit_log = {
        action: params.action,
        details: params.details,
        userId: params.userId,
        ...(params.userName ? { userName: params.userName } : {}),
        ...(params.userRole ? { userRole: params.userRole } : {}),
        ...(params.targetId ? { targetId: params.targetId } : {}),
        ...(params.targetType ? { targetType: params.targetType } : {}),
        payload: params.payload,
        timestamp: serverTimestamp(),
    };
    await setDoc(logRef, logData as any);
    return logRef.id;
}

export interface AssignStudentsParams {
    schoolId: string;
    studentIds: string[];
    toClassId: string;
    toClassName: string;
    academicYear: string;
    userId: string;
    userName?: string;
    userRole?: string;
    reason?: string;
}

export interface AssignStudentsResult {
    assigned: number;
    unchanged: number;
    auditLogId: string | null;
}

/**
 * Réaffecte en lot une liste d'élèves vers `toClassId`, pour l'année en
 * cours. Utilisé par l'écran "Attribution de Classes en Lot" (corrections
 * ponctuelles), et réutilisable pour toute réaffectation manuelle.
 */
export async function assignStudentsToClass(params: AssignStudentsParams): Promise<AssignStudentsResult> {
    const { schoolId, studentIds, toClassId, toClassName, academicYear, userId, userName, userRole, reason } = params;
    if (!schoolId || !toClassId || studentIds.length === 0) {
        return { assigned: 0, unchanged: 0, auditLogId: null };
    }

    const entries: ClassAssignmentEntry[] = [];
    const classCountDeltas: Record<string, number> = {};

    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
        const chunk = studentIds.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const studentId of chunk) {
            const entry = await closeAndCreateAssignment(
                batch, schoolId, studentId, academicYear, toClassId, toClassName,
                'normal', userId, reason, { fromAcademicYear: academicYear },
            );
            if (entry) {
                entries.push(entry);
                if (entry.fromClassId) classCountDeltas[entry.fromClassId] = (classCountDeltas[entry.fromClassId] ?? 0) - 1;
                classCountDeltas[entry.toClassId] = (classCountDeltas[entry.toClassId] ?? 0) + 1;
            }
        }
        await batch.commit();
    }

    await applyClassCountDeltas(schoolId, classCountDeltas);

    const auditLogId = await writeClassAssignmentAuditLog({
        schoolId,
        action: 'eleves.attribution_classe',
        details: `${entries.length} élève(s) affecté(s) à ${toClassName}${reason ? ` — ${reason}` : ''}`,
        userId,
        userName,
        userRole,
        targetId: toClassId,
        targetType: 'classe',
        payload: { academicYear, entries },
    });

    return { assigned: entries.length, unchanged: studentIds.length - entries.length, auditLogId };
}

export interface PromotionRule {
    studentId: string;
    fromClassId: string;
    toClassId: string;
    toClassName: string;
    promotionType: Assignment['promotionType'];
}

export interface PromoteStudentsResult {
    promoted: number;
    skipped: number;
    errors: { studentId: string; reason: string }[];
    auditLogId: string | null;
}

/**
 * Promeut chaque élève listé vers sa classe cible pour `toYear`, en clôturant
 * l'affectation active correspondant à `fromClassId`.
 */
export async function promoteStudentsToClasses(
    schoolId: string,
    rules: PromotionRule[],
    toYear: string,
    userId: string,
    userName?: string,
): Promise<PromoteStudentsResult> {
    const result: PromoteStudentsResult = { promoted: 0, skipped: 0, errors: [], auditLogId: null };
    if (!rules.length) return result;

    const entries: ClassAssignmentEntry[] = [];
    const classCountDeltas: Record<string, number> = {};

    for (let i = 0; i < rules.length; i += CHUNK_SIZE) {
        const chunk = rules.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const rule of chunk) {
            try {
                const entry = await closeAndCreateAssignment(
                    batch, schoolId, rule.studentId, toYear, rule.toClassId, rule.toClassName,
                    rule.promotionType, userId, undefined, { filterFromClassId: rule.fromClassId },
                );
                if (entry) {
                    entries.push(entry);
                    if (entry.fromClassId) classCountDeltas[entry.fromClassId] = (classCountDeltas[entry.fromClassId] ?? 0) - 1;
                    classCountDeltas[entry.toClassId] = (classCountDeltas[entry.toClassId] ?? 0) + 1;
                    result.promoted += 1;
                } else {
                    result.skipped += 1;
                }
            } catch (err: any) {
                result.errors.push({ studentId: rule.studentId, reason: err?.message ?? 'unknown' });
                result.skipped += 1;
            }
        }
        await batch.commit();
    }

    await applyClassCountDeltas(schoolId, classCountDeltas);

    result.auditLogId = await writeClassAssignmentAuditLog({
        schoolId,
        action: 'eleves.promotion_classe',
        details: `${entries.length} élève(s) promu(s) vers ${toYear}`,
        userId,
        userName,
        targetType: 'promotion',
        payload: { academicYear: toYear, entries },
    });

    return result;
}

/**
 * Annule une attribution ou une promotion en rejouant `payload.entries` en
 * sens inverse : réactive l'affectation précédente (ou vide `classId` si
 * l'élève n'en avait pas) et remet les effectifs de classe en l'état.
 * Refuse si le journal a déjà été annulé une fois.
 */
export async function revertClassAssignment(
    schoolId: string,
    auditLogId: string,
    userId: string,
): Promise<{ reverted: number }> {
    const logRef = doc(db, `ecoles/${schoolId}/audit_logs/${auditLogId}`);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) throw new Error('Journal introuvable.');
    const logData = logSnap.data() as audit_log;
    if (logData.reverted) throw new Error('Cette opération a déjà été annulée.');

    const payload = logData.payload as ClassAssignmentAuditPayload | undefined;
    if (!payload || !payload.entries?.length) throw new Error('Aucune donnée exploitable pour annuler cette opération.');

    const classCountDeltas: Record<string, number> = {};
    for (let i = 0; i < payload.entries.length; i += CHUNK_SIZE) {
        const chunk = payload.entries.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const entry of chunk) {
            batch.update(doc(db, `ecoles/${schoolId}/inscriptions_classe/${entry.newAssignmentId}`), {
                status: 'reverted',
            });
            if (entry.previousAssignmentId) {
                batch.update(doc(db, `ecoles/${schoolId}/inscriptions_classe/${entry.previousAssignmentId}`), {
                    status: 'active',
                    endDate: deleteField(),
                });
            }

            const studentRef = doc(db, `ecoles/${schoolId}/eleves/${entry.studentId}`);
            if (entry.fromClassId) {
                batch.update(studentRef, {
                    classId: entry.fromClassId,
                    class: entry.fromClassName ?? '',
                    updatedAt: new Date().toISOString(),
                });
            } else {
                batch.update(studentRef, {
                    classId: deleteField(),
                    class: deleteField(),
                    updatedAt: new Date().toISOString(),
                });
            }

            classCountDeltas[entry.toClassId] = (classCountDeltas[entry.toClassId] ?? 0) - 1;
            if (entry.fromClassId) classCountDeltas[entry.fromClassId] = (classCountDeltas[entry.fromClassId] ?? 0) + 1;
        }
        await batch.commit();
    }

    await applyClassCountDeltas(schoolId, classCountDeltas);

    await updateDoc(logRef, {
        reverted: true,
        revertedAt: serverTimestamp(),
        revertedBy: userId,
    });

    return { reverted: payload.entries.length };
}

export const ClassAssignmentService = {
    assignStudentsToClass,
    promoteStudentsToClasses,
    revertClassAssignment,
};
