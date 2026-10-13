/**
 * Passage d'année scolaire — exécution serveur (SDK Admin, contourne les
 * règles Firestore par conception, comme le reste de src/lib/admin-*.ts).
 *
 * Remplace l'ancien flux 100% client (cloneClassesForNewYear +
 * finalizeAcademicYear dans academic-year-service.ts, appelées séquentiellement
 * depuis NewYearWizard) par UNE opération serveur avec un verrou réel :
 *
 *   - Le verrou (`school.yearTransition.status`) est posé dans une
 *     transaction Firestore (lecture + vérification + écriture atomiques) :
 *     deux requêtes simultanées ne peuvent pas toutes les deux passer le
 *     contrôle "pas de transition en cours" — l'ancienne version ne se
 *     protégeait que par une phrase de confirmation côté UI, qui n'empêche
 *     ni un double-clic ni deux administrateurs agissant en même temps.
 *   - Le clonage des classes se fait ensuite hors transaction (potentiellement
 *     plus de documents qu'une transaction Firestore ne peut couvrir),
 *     protégé par le verrou plutôt que par l'atomicité native de Firestore.
 *   - Un échec en cours de route marque le verrou "failed" (avec le message
 *     d'erreur) plutôt que de le laisser bloqué en "in_progress" pour
 *     toujours, ce qui empêcherait toute nouvelle tentative.
 *
 * La promotion individuelle des élèves (promoteStudentsToClasses) reste un
 * flux séparé, côté client — c'est une opération par lot déjà granulaire,
 * réversible (revertClassAssignment), pas une bascule globale de l'école.
 */
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type {
    academicYearTransition,
    class_type as ClassType,
    school as SchoolData,
    staff as Staff,
} from '@/lib/data-types';

const YEAR_FORMAT = /^\d{4}-\d{4}$/;
const CHUNK_SIZE = 400; // marge sous la limite Firestore de 500 opérations par batch

export class YearTransitionValidationError extends Error {}
export class YearTransitionConflictError extends Error {}
export class YearTransitionNotFoundError extends Error {}

/**
 * Reproduit hasPermission(schoolId, 'manageClasses') des règles Firestore
 * (isSuperAdmin || isDirector || permission explicite du rôle admin) — les
 * routes serveur passant par le SDK Admin ne sont jamais soumises aux
 * règles, donc doivent réimplémenter le contrôle elles-mêmes (même
 * convention que hasManageUsersPermission dans /api/staff/remove).
 */
export async function hasManageClassesPermission(db: Firestore, uid: string, schoolId: string): Promise<boolean> {
    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = userSnap.data() as { isSuperAdmin?: boolean; schools?: Record<string, string> } | undefined;
    if (userData?.isSuperAdmin === true) return true;

    const schoolSnap = await db.doc(`ecoles/${schoolId}`).get();
    const schoolData = schoolSnap.data() as SchoolData | undefined;
    if (schoolData?.directorId === uid) return true;
    if (userData?.schools?.[schoolId] === 'directeur') return true;

    const staffSnap = await db.doc(`ecoles/${schoolId}/personnel/${uid}`).get();
    const staffData = staffSnap.data() as Staff | undefined;
    if (staffData?.adminRole) {
        const roleSnap = await db.doc(`ecoles/${schoolId}/admin_roles/${staffData.adminRole}`).get();
        if (roleSnap.data()?.permissions?.manageClasses === true) return true;
    }
    return false;
}

export interface StartNewYearParams {
    schoolId: string;
    toYear: string;
    notes?: string;
    userId: string;
    userName?: string;
}

export interface StartNewYearResult {
    fromYear: string;
    toYear: string;
    cloned: number;
    archived: number;
    mapping: Record<string, string>;
    transitionId: string;
}

export async function startNewAcademicYear(db: Firestore, params: StartNewYearParams): Promise<StartNewYearResult> {
    const { schoolId, toYear, notes, userId, userName } = params;
    if (!YEAR_FORMAT.test(toYear)) {
        throw new YearTransitionValidationError("Le format de l'année doit être AAAA-AAAA.");
    }

    const schoolRef = db.doc(`ecoles/${schoolId}`);

    // 1) Verrou posé de façon atomique : lecture + vérification + écriture
    //    dans la même transaction.
    const fromYear = await db.runTransaction(async (tx: Transaction) => {
        const snap = await tx.get(schoolRef);
        if (!snap.exists) throw new YearTransitionNotFoundError('École introuvable.');
        const data = snap.data() as SchoolData;

        const currentYear = data.currentAcademicYear;
        if (!currentYear) {
            throw new YearTransitionValidationError("Cette école n'a pas encore d'année scolaire courante définie.");
        }
        if (currentYear === toYear) {
            throw new YearTransitionValidationError("La nouvelle année doit être différente de l'année courante.");
        }
        if (data.yearTransition?.status === 'in_progress') {
            throw new YearTransitionConflictError("Une transition d'année est déjà en cours pour cette école.");
        }

        tx.update(schoolRef, {
            yearTransition: {
                status: 'in_progress',
                fromYear: currentYear,
                toYear,
                startedBy: userId,
                startedAt: FieldValue.serverTimestamp(),
            },
        });
        return currentYear;
    });

    try {
        // 2) Clonage des classes actives de fromYear + archivage des originales.
        const classesRef = db.collection(`ecoles/${schoolId}/classes`);
        const activeSnap = await classesRef
            .where('academicYear', '==', fromYear)
            .where('status', '==', 'active')
            .get();

        const mapping: Record<string, string> = {};
        let cloned = 0;
        let archived = 0;

        for (let i = 0; i < activeSnap.docs.length; i += CHUNK_SIZE) {
            const chunk = activeSnap.docs.slice(i, i + CHUNK_SIZE);
            const batch = db.batch();
            for (const oldDoc of chunk) {
                const oldData = oldDoc.data() as ClassType;
                const newRef = classesRef.doc();
                const { id: _ignoredId, createdAt: _c, updatedAt: _u, ...payload } = oldData as any;
                batch.set(newRef, {
                    ...payload,
                    schoolId,
                    academicYear: toYear,
                    studentCount: 0,
                    status: 'active',
                    createdBy: userId,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    previousClassId: oldDoc.id,
                });
                mapping[oldDoc.id] = newRef.id;
                cloned += 1;

                batch.update(oldDoc.ref, { status: 'archived', updatedAt: FieldValue.serverTimestamp() });
                archived += 1;
            }
            await batch.commit();
        }

        // 3) Finalise : bascule l'année courante, archive l'ancienne, vide les
        //    périodes, journalise, et LÈVE le verrou.
        const finalSnap = await schoolRef.get();
        const finalData = finalSnap.data() as SchoolData;
        const archivedYears = Array.isArray(finalData.archivedYears) ? [...finalData.archivedYears] : [];
        if (!archivedYears.includes(fromYear)) archivedYears.push(fromYear);

        const transitionRef = db.collection(`ecoles/${schoolId}/academic_year_transitions`).doc();
        const finalizeBatch = db.batch();
        finalizeBatch.update(schoolRef, {
            currentAcademicYear: toYear,
            archivedYears,
            academicPeriods: [],
            updatedAt: FieldValue.serverTimestamp(),
            yearTransition: {
                status: 'completed',
                fromYear,
                toYear,
                startedBy: userId,
                completedAt: FieldValue.serverTimestamp(),
            },
        });
        finalizeBatch.set(transitionRef, {
            schoolId,
            fromYear,
            toYear,
            status: 'completed',
            classesCloned: cloned,
            studentsPromoted: 0,
            startedBy: userId,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            notes: notes ?? '',
        } satisfies academicYearTransition);

        const auditRef = db.collection(`ecoles/${schoolId}/audit_logs`).doc();
        finalizeBatch.set(auditRef, {
            action: 'annee_scolaire.bascule',
            details: `Bascule de l'année scolaire ${fromYear} vers ${toYear} — ${cloned} classe(s) clonée(s).`,
            userId,
            ...(userName ? { userName } : {}),
            targetId: transitionRef.id,
            targetType: 'academic_year_transition',
            payload: { fromYear, toYear, classesCloned: cloned, studentsPromoted: 0 },
            timestamp: FieldValue.serverTimestamp(),
        });

        await finalizeBatch.commit();

        return { fromYear, toYear, cloned, archived, mapping, transitionId: transitionRef.id };
    } catch (err: any) {
        // Best-effort : ne laisse pas le verrou bloqué en 'in_progress' si le
        // clonage/la finalisation échoue en cours de route, sinon plus
        // personne ne peut relancer de transition pour cette école.
        await schoolRef.update({
            'yearTransition.status': 'failed',
            'yearTransition.error': String(err?.message ?? err),
        }).catch(() => {});
        throw err;
    }
}
