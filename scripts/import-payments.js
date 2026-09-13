/**
 * Import des paiements de scolarité 2025-2026 (Le Mini Monde) à partir des
 * tableaux détaillés par classe (Inscription / 1er / 2e / 3e / 4e versement).
 *
 * Ce script reproduit exactement les 4 écritures que fait l'app quand un
 * paiement est enregistré à la main (cf. src/components/students/payments-tab.tsx) :
 *   1. un document dans  ecoles/{schoolId}/eleves/{studentId}/paiements
 *   2. une transaction dans ecoles/{schoolId}/comptabilite
 *   3. la mise à jour de eleve.amountDue / eleve.tuitionStatus
 *   4. l'incrément de ecoles/{schoolId}/stats/finance.totalAmountDue
 *
 * SÉCURITÉ : le script tourne par défaut en mode "dry-run" (aucune écriture,
 * juste un rapport). Il ne touche à Firestore que si vous ajoutez --apply.
 *
 * Prérequis :
 *   - `npm install` déjà fait (firebase-admin est une dépendance du projet).
 *   - Des credentials Google valides pour le projet Firebase `greecole` :
 *       soit `gcloud auth application-default login` (recommandé si vous
 *       avez le rôle propriétaire/éditeur sur le projet),
 *       soit `GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json`
 *       (clé de compte de service avec accès Firestore sur `greecole`).
 *
 * Usage :
 *   node scripts/import-payments.js                 # dry-run (recommandé en premier)
 *   node scripts/import-payments.js --apply          # écrit réellement dans Firestore
 *   node scripts/import-payments.js --apply --allow-existing   # force même si des
 *                                    paiements existent déjà pour l'année pour un élève
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const DATA = require('./data/paiements-2025-2026');

const SCHOOL_NAME_QUERY = 'mini monde';
const IMPORT_BATCH_TAG = 'seed-paiements-2025-2026-v1';
const DEFAULT_METHOD = 'Espèces';
const FIRESTORE_BATCH_OP_LIMIT = 400; // marge sous la limite Firestore de 500

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALLOW_EXISTING = args.includes('--allow-existing');

// --- Calendrier des échéances : rentrée = septembre 2025, jusqu'à janvier 2026 ---
// Jour du mois déterministe entre le 5 et le 10 (reproductible d'un run à l'autre).
const COLUMN_SCHEDULE = [
  { key: 'insc', description: 'Inscription', year: 2025, month: 9 },
  { key: 'v1', description: '1er Versement', year: 2025, month: 10 },
  { key: 'v2', description: '2e Versement', year: 2025, month: 11 },
  { key: 'v3', description: '3e Versement', year: 2025, month: 12 },
  { key: 'v4', description: '4e Versement', year: 2026, month: 1 },
];

function dayOfMonthFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return 5 + (hash % 6); // 5..10 inclus
}

function isoDateFor(studentName, columnKey, year, month, suffix) {
  const day = dayOfMonthFor(`${studentName}|${columnKey}|${suffix || ''}`);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// --- Normalisation des noms pour le rapprochement ---
function normalizeName(raw) {
  return (raw || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents
    .toUpperCase()
    .replace(/0/g, 'O') // typo fréquente relevée (ex: K0UADI0 -> KOUADIO)
    .replace(/[^A-Z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function studentFullName(student) {
  return `${student.lastName || ''} ${student.firstName || ''}`.trim();
}

// --- Extraction des paiements d'une ligne de données vers une liste plate ---
function buildPaymentEntries(row) {
  const entries = [];
  for (const col of COLUMN_SCHEDULE) {
    const raw = row[col.key];
    if (raw === null || raw === undefined || raw === '') continue;

    if (typeof raw === 'string' && raw.includes('+')) {
      const parts = raw.split('+').map(p => parseInt(p.trim(), 10)).filter(n => Number.isFinite(n) && n > 0);
      parts.forEach((amount, idx) => {
        entries.push({
          amount,
          description: col.description,
          date: isoDateFor(row.name, col.key, col.year, col.month, String(idx)),
        });
      });
      continue;
    }

    const amount = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
    if (Number.isFinite(amount) && amount > 0) {
      entries.push({
        amount,
        description: col.description,
        date: isoDateFor(row.name, col.key, col.year, col.month),
      });
    }
  }
  return entries;
}

function sumEntries(entries) {
  return entries.reduce((s, e) => s + e.amount, 0);
}

async function findSchool(db) {
  const snap = await db.collection('ecoles').get();
  const matches = [];
  snap.forEach(doc => {
    const name = (doc.data().name || '').toLowerCase();
    if (name.includes(SCHOOL_NAME_QUERY)) matches.push({ id: doc.id, name: doc.data().name });
  });
  if (matches.length === 0) {
    throw new Error(`Aucune école ne correspond à "${SCHOOL_NAME_QUERY}" dans la collection ecoles/.`);
  }
  if (matches.length > 1) {
    throw new Error(`Plusieurs écoles correspondent à "${SCHOOL_NAME_QUERY}" : ${matches.map(m => `${m.name} (${m.id})`).join(', ')}. Précisez SCHOOL_NAME_QUERY dans le script.`);
  }
  return matches[0];
}

async function findClass(db, schoolId, className) {
  const snap = await db.collection(`ecoles/${schoolId}/classes`)
    .where('name', '==', className)
    .get();
  const candidates = snap.docs.filter(d => (d.data().academicYear || DATA.academicYear) === DATA.academicYear);
  const chosen = candidates.length > 0 ? candidates : snap.docs;
  if (chosen.length === 0) return null;
  if (chosen.length > 1) {
    console.warn(`  ⚠ Plusieurs classes nommées "${className}" trouvées, on prend la première (${chosen[0].id}).`);
  }
  return { id: chosen[0].id, ...chosen[0].data() };
}

async function fetchStudentsOfClass(db, schoolId, classId) {
  const snap = await db.collection(`ecoles/${schoolId}/eleves`).where('classId', '==', classId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function matchStudent(rowName, studentsInClass, indexCache) {
  const targetNorm = normalizeName(rowName);
  if (!indexCache.byNormalizedName) {
    indexCache.byNormalizedName = new Map();
    for (const s of studentsInClass) {
      const norm = normalizeName(studentFullName(s));
      if (!indexCache.byNormalizedName.has(norm)) indexCache.byNormalizedName.set(norm, []);
      indexCache.byNormalizedName.get(norm).push(s);
    }
  }
  const exact = indexCache.byNormalizedName.get(targetNorm);
  if (exact && exact.length === 1) return { status: 'ok', student: exact[0] };
  if (exact && exact.length > 1) return { status: 'ambiguous', candidates: exact };

  // Repli : comparaison par ensemble de tokens (ordre différent, ex. prénom/nom inversés).
  const targetTokens = new Set(targetNorm.split(' '));
  const tokenMatches = studentsInClass.filter(s => {
    const tokens = new Set(normalizeName(studentFullName(s)).split(' '));
    if (tokens.size !== targetTokens.size) return false;
    for (const t of targetTokens) if (!tokens.has(t)) return false;
    return true;
  });
  if (tokenMatches.length === 1) return { status: 'ok', student: tokenMatches[0] };
  if (tokenMatches.length > 1) return { status: 'ambiguous', candidates: tokenMatches };
  return { status: 'not_found' };
}

async function hasExistingPayments(db, schoolId, studentId, academicYear) {
  const snap = await db.collection(`ecoles/${schoolId}/eleves/${studentId}/paiements`)
    .where('academicYear', '==', academicYear)
    .limit(1)
    .get();
  return !snap.empty;
}

async function hasAlreadyImportedTag(db, schoolId, studentId) {
  const snap = await db.collection(`ecoles/${schoolId}/eleves/${studentId}/paiements`)
    .where('importBatch', '==', IMPORT_BATCH_TAG)
    .limit(1)
    .get();
  return !snap.empty;
}

async function main() {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'greecole',
  });
  const db = admin.firestore();

  console.log(APPLY
    ? '🚨 MODE RÉEL (--apply) : les écritures ci-dessous vont être appliquées à Firestore.'
    : '🧪 MODE DRY-RUN (par défaut) : aucune écriture ne sera faite. Relancez avec --apply pour exécuter.');

  const school = await findSchool(db);
  console.log(`École trouvée : ${school.name} (${school.id})\n`);

  const report = {
    unmatched: [],
    ambiguous: [],
    skippedAlreadyImported: [],
    skippedNoPayments: [],
    imported: [],
    classTotals: [],
  };

  for (const className of DATA.classOrder) {
    const classData = DATA.classes.find(c => c.className === className);
    if (!classData) continue;

    console.log(`\n=== ${className} ===`);
    const classDoc = await findClass(db, school.id, className);
    if (!classDoc) {
      console.error(`  ✗ Classe "${className}" introuvable dans ecoles/${school.id}/classes — élèves ignorés.`);
      classData.students.forEach(s => report.unmatched.push({ class: className, name: s.name, reason: 'classe introuvable' }));
      continue;
    }

    const studentsInClass = await fetchStudentsOfClass(db, school.id, classDoc.id);
    const indexCache = {};
    let classSumInsc = 0, classSumV1 = 0, classSumV2 = 0, classSumV3 = 0, classSumV4 = 0;

    for (const row of classData.students) {
      const match = matchStudent(row.name, studentsInClass, indexCache);

      if (match.status === 'not_found') {
        console.error(`  ✗ "${row.name}" : aucun élève correspondant trouvé dans ${className}.`);
        report.unmatched.push({ class: className, name: row.name, reason: 'non trouvé' });
        continue;
      }
      if (match.status === 'ambiguous') {
        console.error(`  ✗ "${row.name}" : ${match.candidates.length} élèves correspondent (${match.candidates.map(studentFullName).join(' / ')}) — à résoudre manuellement.`);
        report.ambiguous.push({ class: className, name: row.name, candidates: match.candidates.map(c => ({ id: c.id, name: studentFullName(c) })) });
        continue;
      }

      const student = match.student;
      const entries = buildPaymentEntries(row);
      const sumInsc = row.insc || 0;
      classSumInsc += sumInsc;
      classSumV1 += row.v1 || 0;
      classSumV2 += row.v2 || 0;
      classSumV3 += row.v3 || 0;

      if (entries.length === 0) {
        console.log(`  · "${row.name}" : aucun versement enregistré, rien à importer.`);
        report.skippedNoPayments.push({ class: className, name: row.name });
        continue;
      }

      const totalPaid = sumEntries(entries);
      const computedReste = row.total - totalPaid;
      if (row.reste !== null && Math.abs(computedReste - row.reste) > 1) {
        console.warn(`  ⚠ "${row.name}" : reste calculé (${computedReste}) ≠ reste indiqué (${row.reste}) — vérifiez le montant total ou les versements.`);
      }

      if (!ALLOW_EXISTING && await hasExistingPayments(db, school.id, student.id, DATA.academicYear)) {
        console.warn(`  ⚠ "${row.name}" (${studentFullName(student)}) a déjà des paiements enregistrés pour ${DATA.academicYear} — ignoré (utilisez --allow-existing pour forcer).`);
        report.skippedAlreadyImported.push({ class: className, name: row.name, studentId: student.id });
        continue;
      }
      if (await hasAlreadyImportedTag(db, school.id, student.id)) {
        console.log(`  · "${row.name}" : déjà importé lors d'un run précédent de ce script — ignoré.`);
        report.skippedAlreadyImported.push({ class: className, name: row.name, studentId: student.id, reason: 'déjà importé (tag)' });
        continue;
      }

      console.log(`  ✓ "${row.name}" -> ${studentFullName(student)} (${student.id}) : ${entries.length} paiement(s), total ${totalPaid.toLocaleString('fr-FR')} FCFA, reste ${computedReste.toLocaleString('fr-FR')} FCFA.`);
      report.imported.push({ class: className, name: row.name, studentId: student.id, entries, totalPaid, computedReste });

      if (APPLY) {
        await applyPaymentsForStudent(db, school.id, student, entries, computedReste);
      }
    }

    if (classData.declaredTotals) {
      const d = classData.declaredTotals;
      const diffs = [];
      if (d.insc != null && d.insc !== classSumInsc) diffs.push(`Inscription: attendu ${d.insc}, calculé ${classSumInsc}`);
      if (d.v1 != null && d.v1 !== classSumV1) diffs.push(`1er versement: attendu ${d.v1}, calculé ${classSumV1}`);
      if (d.v2 != null && d.v2 !== classSumV2) diffs.push(`2e versement: attendu ${d.v2}, calculé ${classSumV2}`);
      if (diffs.length > 0) {
        console.warn(`  ⚠ Écart avec la ligne TOTAL du tableau source pour ${className} : ${diffs.join(' ; ')}`);
      } else {
        console.log(`  ✓ Totaux de colonnes cohérents avec la ligne TOTAL du tableau source.`);
      }
    }
  }

  // Cas connus, non présents dans les données structurées, à traiter à la main.
  report.manualReview = [
    { class: 'CPU-A', name: '(ligne n°20, sans nom)', reason: 'aucun nom dans le tableau source, impossible à rapprocher' },
    { class: 'CPU-A', name: 'DJOUBISSE KAYLIE PRINCESSE', reason: "présente seulement dans le récapitulatif global (315000 payé), aucune ventilation par échéance dans le tableau détaillé" },
  ];

  console.log('\n\n=========== RAPPORT ===========');
  console.log(`Importés (ou prêts à l'être) : ${report.imported.length}`);
  console.log(`Aucun versement (ignorés)    : ${report.skippedNoPayments.length}`);
  console.log(`Déjà des paiements (ignorés) : ${report.skippedAlreadyImported.length}`);
  console.log(`Non trouvés                  : ${report.unmatched.length}`);
  console.log(`Ambigus                      : ${report.ambiguous.length}`);
  console.log(`À traiter manuellement       : ${report.manualReview.length}`);

  if (report.unmatched.length > 0) {
    console.log('\n--- Non trouvés ---');
    report.unmatched.forEach(u => console.log(`  - [${u.class}] ${u.name} (${u.reason})`));
  }
  if (report.ambiguous.length > 0) {
    console.log('\n--- Ambigus ---');
    report.ambiguous.forEach(a => console.log(`  - [${a.class}] ${a.name} -> ${a.candidates.map(c => c.name).join(' / ')}`));
  }
  if (report.manualReview.length > 0) {
    console.log('\n--- À traiter manuellement ---');
    report.manualReview.forEach(m => console.log(`  - [${m.class}] ${m.name} : ${m.reason}`));
  }

  const reportPath = path.join(__dirname, `import-payments-report-${APPLY ? 'apply' : 'dryrun'}-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nRapport détaillé écrit dans : ${reportPath}`);

  if (!APPLY) {
    console.log('\n🧪 Dry-run terminé — AUCUNE écriture faite. Relancez avec --apply pour importer réellement.');
  } else {
    console.log('\n✅ Import terminé.');
  }
}

async function applyPaymentsForStudent(db, schoolId, student, entries, computedReste) {
  const totalPaid = sumEntries(entries);
  const newAmountDue = Math.max(0, computedReste);
  const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';
  const payerFirstName = student.parent1FirstName || 'Parent';
  const payerLastName = student.parent1LastName || '';
  const payerContact = student.parent1Contact || '';

  // Chunk defensif si jamais un élève avait beaucoup de versements (jamais le cas ici,
  // mais évite de dépasser la limite de 500 opérations par batch Firestore).
  for (let i = 0; i < entries.length; i += FIRESTORE_BATCH_OP_LIMIT) {
    const chunk = entries.slice(i, i + FIRESTORE_BATCH_OP_LIMIT);
    const batch = db.batch();

    for (const entry of chunk) {
      const accountingRef = db.collection(`ecoles/${schoolId}/comptabilite`).doc();
      batch.set(accountingRef, {
        schoolId,
        studentId: student.id,
        date: entry.date,
        description: `${entry.description} - ${student.firstName || ''} ${student.lastName || ''}`.trim(),
        category: 'Scolarité',
        type: 'Revenu',
        amount: entry.amount,
        academicYear: DATA.academicYear,
        importBatch: IMPORT_BATCH_TAG,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const paymentRef = db.collection(`ecoles/${schoolId}/eleves/${student.id}/paiements`).doc();
      batch.set(paymentRef, {
        schoolId,
        studentId: student.id,
        date: entry.date,
        amount: entry.amount,
        description: entry.description,
        accountingTransactionId: accountingRef.id,
        payerFirstName,
        payerLastName,
        payerContact,
        method: DEFAULT_METHOD,
        academicYear: DATA.academicYear,
        importBatch: IMPORT_BATCH_TAG,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // La mise à jour du solde élève et le compteur global ne sont appliqués
    // qu'une seule fois, sur le dernier lot, pour refléter l'état final.
    if (i + FIRESTORE_BATCH_OP_LIMIT >= entries.length) {
      batch.update(db.doc(`ecoles/${schoolId}/eleves/${student.id}`), {
        amountDue: newAmountDue,
        tuitionStatus: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(db.doc(`ecoles/${schoolId}/stats/finance`), {
        totalAmountDue: admin.firestore.FieldValue.increment(-totalPaid),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ Erreur fatale :', err);
    process.exit(1);
  });
}

module.exports = { normalizeName, buildPaymentEntries, sumEntries, isoDateFor, dayOfMonthFor, matchStudent };
