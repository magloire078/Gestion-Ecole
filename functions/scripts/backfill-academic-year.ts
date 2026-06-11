/**
 * Backfill `academicYear` sur les documents existants.
 *
 * Pour chaque école et chaque collection concernée (notes, frais,
 * paiements, comptabilité), parcourt les documents sans `academicYear` et
 * le calcule à partir de la `date` du doc (convention septembre→août).
 * Si la date manque, on tombe sur `school.currentAcademicYear`.
 *
 * Authentification :
 *   - GOOGLE_APPLICATION_CREDENTIALS pointant vers un service account JSON, ou
 *   - `gcloud auth application-default login`
 *
 * Usage :
 *   cd functions
 *   npx ts-node scripts/backfill-academic-year.ts [--project=<id>] [--school=<schoolId>] [--dry-run]
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const projectArg = process.argv.find(a => a.startsWith('--project='))?.split('=')[1];
const schoolFilter = process.argv.find(a => a.startsWith('--school='))?.split('=')[1];
const dryRun = process.argv.includes('--dry-run');

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: projectArg || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
    });
}

const db = getFirestore();

function computeYearFromDate(rawDate?: string): string | null {
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    return d.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

interface Stats { scanned: number; updated: number; skipped: number; }

async function backfillRootCollection(
    schoolId: string,
    collectionName: string,
    currentYear: string,
    stats: Stats,
): Promise<void> {
    const snap = await db.collection(`ecoles/${schoolId}/${collectionName}`).get();
    for (const doc of snap.docs) {
        stats.scanned += 1;
        const data = doc.data();
        if (data.academicYear) {
            stats.skipped += 1;
            continue;
        }
        const year = computeYearFromDate(data.date) || currentYear;
        if (!year) continue;
        if (!dryRun) {
            await doc.ref.update({ academicYear: year, backfilledAt: FieldValue.serverTimestamp() });
        }
        stats.updated += 1;
    }
}

async function backfillStudentSubcollection(
    schoolId: string,
    subcollection: 'notes' | 'paiements' | 'absences' | 'incidents_disciplinaires',
    currentYear: string,
    stats: Stats,
): Promise<void> {
    const studentsSnap = await db.collection(`ecoles/${schoolId}/eleves`).get();
    for (const studentDoc of studentsSnap.docs) {
        const sub = await db.collection(`ecoles/${schoolId}/eleves/${studentDoc.id}/${subcollection}`).get();
        for (const doc of sub.docs) {
            stats.scanned += 1;
            const data = doc.data();
            if (data.academicYear) {
                stats.skipped += 1;
                continue;
            }
            const year = computeYearFromDate(data.date) || currentYear;
            if (!year) continue;
            if (!dryRun) {
                await doc.ref.update({ academicYear: year, backfilledAt: FieldValue.serverTimestamp() });
            }
            stats.updated += 1;
        }
    }
}

async function backfillSchool(schoolId: string): Promise<void> {
    const snap = await db.doc(`ecoles/${schoolId}`).get();
    if (!snap.exists) return;
    const data = snap.data();
    const currentYear = data?.currentAcademicYear as string | undefined;
    if (!currentYear) {
        console.warn(`[skip] ${schoolId} sans currentAcademicYear`);
        return;
    }
    console.log(`\n=== École ${schoolId} (${data?.name ?? ''}) → année courante ${currentYear} ===`);

    const totals: Record<string, Stats> = {};
    const init = () => ({ scanned: 0, updated: 0, skipped: 0 });

    totals.comptabilite = init();
    totals.frais_scolarite = init();
    totals.notes = init();
    totals.paiements = init();
    totals.absences = init();
    totals.incidents_disciplinaires = init();

    await backfillRootCollection(schoolId, 'comptabilite', currentYear, totals.comptabilite);
    await backfillRootCollection(schoolId, 'frais_scolarite', currentYear, totals.frais_scolarite);
    await backfillStudentSubcollection(schoolId, 'notes', currentYear, totals.notes);
    await backfillStudentSubcollection(schoolId, 'paiements', currentYear, totals.paiements);
    await backfillStudentSubcollection(schoolId, 'absences', currentYear, totals.absences);
    await backfillStudentSubcollection(schoolId, 'incidents_disciplinaires', currentYear, totals.incidents_disciplinaires);

    for (const [key, stats] of Object.entries(totals)) {
        console.log(`  ${key.padEnd(18)} scanned=${stats.scanned} updated=${stats.updated} skipped=${stats.skipped}`);
    }
}

(async () => {
    try {
        if (dryRun) console.log('Mode DRY RUN : aucune écriture.\n');
        const targets: string[] = schoolFilter
            ? [schoolFilter]
            : (await db.collection('ecoles').get()).docs.map(d => d.id);
        for (const schoolId of targets) {
            await backfillSchool(schoolId);
        }
        console.log('\nTerminé.');
        process.exit(0);
    } catch (err) {
        console.error('[backfill] erreur', err);
        process.exit(1);
    }
})();
