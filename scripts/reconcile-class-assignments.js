/**
 * Rapport de réconciliation élève ↔ classe (lecture seule).
 *
 * Contexte : avant l'unification sur `inscriptions_classe` (services
 * class-assignment-service.ts / academic-year-service.ts), la relation
 * élève↔classe pouvait être représentée par trois mécanismes différents et
 * pas toujours synchronisés : `eleve.classId` (champ direct),
 * `eleve.enrollments[]` (historique embarqué, aujourd'hui en lecture seule
 * pour compatibilité) et `inscriptions_classe` (la source de vérité désormais
 * alimentée par tous les écrans de réaffectation/promotion).
 *
 * Ce script ne modifie RIEN dans Firestore. Il compare les trois sources pour
 * chaque élève et produit un rapport (console + CSV) des cas à examiner
 * manuellement avant toute correction :
 *
 *   - NO_HISTORY     : aucune entrée dans inscriptions_classe pour cet élève
 *                      (jamais touché par le nouveau système — classId/
 *                      enrollments restent la seule trace de sa classe).
 *   - MISMATCH       : une affectation `active` existe dans inscriptions_classe,
 *                      mais sa classe ne correspond pas à eleve.classId.
 *   - NO_ACTIVE      : des affectations existent mais aucune n'est `active`
 *                      (toutes transférées/annulées) — classId ne reflète alors
 *                      la décision d'aucun système, à vérifier manuellement.
 *   - MULTIPLE_ACTIVE: plus d'une affectation `active` simultanée pour le même
 *                      élève — anomalie de données, ne devrait jamais arriver.
 *   - OK             : une affectation `active` existe et correspond à classId.
 *
 * Prérequis (identiques à scripts/import-payments.js) :
 *   - `npm install` déjà fait (firebase-admin est une dépendance du projet).
 *   - Des credentials Google valides pour le projet Firebase `greecole` :
 *       soit `gcloud auth application-default login`,
 *       soit `GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json`.
 *
 * Usage :
 *   node scripts/reconcile-class-assignments.js                  # toutes les écoles
 *   node scripts/reconcile-class-assignments.js --school=<id>    # une seule école
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const SCHOOL_FILTER = (args.find(a => a.startsWith('--school=')) || '').split('=')[1] || null;

function studentFullName(student) {
  return `${student.lastName || ''} ${student.firstName || ''}`.trim() || '(sans nom)';
}

/**
 * Regroupe les affectations d'une école par studentId, triées par
 * startDate/createdAt décroissant (la plus récente en premier).
 */
function groupAssignmentsByStudent(assignmentDocs) {
  const byStudent = new Map();
  for (const doc of assignmentDocs) {
    const data = doc.data();
    const list = byStudent.get(data.studentId) || [];
    list.push({ id: doc.id, ...data });
    byStudent.set(data.studentId, list);
  }
  for (const list of byStudent.values()) {
    list.sort((a, b) => {
      const da = a.startDate || '';
      const db_ = b.startDate || '';
      return db_.localeCompare(da);
    });
  }
  return byStudent;
}

function classifyStudent(student, assignments) {
  const activeOnes = assignments.filter(a => a.status === 'active');
  const enrollmentsLast = Array.isArray(student.enrollments) && student.enrollments.length > 0
    ? student.enrollments[student.enrollments.length - 1]
    : null;

  let category;
  let activeClasseId = null;
  if (assignments.length === 0) {
    category = 'NO_HISTORY';
  } else if (activeOnes.length > 1) {
    category = 'MULTIPLE_ACTIVE';
    activeClasseId = activeOnes.map(a => a.classeId).join(' / ');
  } else if (activeOnes.length === 0) {
    category = 'NO_ACTIVE';
  } else {
    activeClasseId = activeOnes[0].classeId;
    category = activeClasseId === student.classId ? 'OK' : 'MISMATCH';
  }

  return {
    category,
    studentId: student.id,
    name: studentFullName(student),
    status: student.status || '',
    classId: student.classId || '',
    activeAssignmentClasseId: activeClasseId || '',
    assignmentCount: assignments.length,
    enrollmentsLastClassId: enrollmentsLast ? (enrollmentsLast.classId || '') : '(aucune entrée)',
    enrollmentsLastYear: enrollmentsLast ? (enrollmentsLast.academicYear || '') : '',
  };
}

function toCsv(rows) {
  const headers = [
    'schoolId', 'category', 'studentId', 'name', 'status', 'classId',
    'activeAssignmentClasseId', 'assignmentCount', 'enrollmentsLastClassId', 'enrollmentsLastYear',
  ];
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

async function main() {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'greecole',
  });
  const db = admin.firestore();

  console.log('🔎 Rapport de réconciliation élève ↔ classe (lecture seule, aucune écriture).\n');

  let schoolIds;
  if (SCHOOL_FILTER) {
    schoolIds = [SCHOOL_FILTER];
  } else {
    const schoolsSnap = await db.collection('ecoles').get();
    schoolIds = schoolsSnap.docs.map(d => d.id);
  }
  console.log(`${schoolIds.length} école(s) à analyser.\n`);

  const globalTotals = { OK: 0, NO_HISTORY: 0, MISMATCH: 0, NO_ACTIVE: 0, MULTIPLE_ACTIVE: 0 };
  const flaggedRows = [];

  for (const schoolId of schoolIds) {
    const [studentsSnap, assignmentsSnap] = await Promise.all([
      db.collection(`ecoles/${schoolId}/eleves`).get(),
      db.collection(`ecoles/${schoolId}/inscriptions_classe`).get(),
    ]);

    if (studentsSnap.empty) continue;

    const assignmentsByStudent = groupAssignmentsByStudent(assignmentsSnap.docs);
    const schoolTotals = { OK: 0, NO_HISTORY: 0, MISMATCH: 0, NO_ACTIVE: 0, MULTIPLE_ACTIVE: 0 };

    for (const studentDoc of studentsSnap.docs) {
      const student = { id: studentDoc.id, ...studentDoc.data() };
      const assignments = assignmentsByStudent.get(studentDoc.id) || [];
      const result = classifyStudent(student, assignments);

      schoolTotals[result.category] += 1;
      globalTotals[result.category] += 1;

      if (result.category !== 'OK') {
        flaggedRows.push({ schoolId, ...result });
      }
    }

    console.log(`École ${schoolId} (${studentsSnap.size} élève(s)) :`);
    console.log(`  OK=${schoolTotals.OK}  NO_HISTORY=${schoolTotals.NO_HISTORY}  MISMATCH=${schoolTotals.MISMATCH}  NO_ACTIVE=${schoolTotals.NO_ACTIVE}  MULTIPLE_ACTIVE=${schoolTotals.MULTIPLE_ACTIVE}`);
  }

  console.log('\n=== Total toutes écoles ===');
  console.log(`  OK              : ${globalTotals.OK}`);
  console.log(`  NO_HISTORY      : ${globalTotals.NO_HISTORY}  (jamais touché par inscriptions_classe — normal pour les élèves créés avant l'unification, ou pas encore réaffectés/promus depuis)`);
  console.log(`  MISMATCH        : ${globalTotals.MISMATCH}  (⚠️ à examiner — classId ne correspond pas à l'affectation active)`);
  console.log(`  NO_ACTIVE       : ${globalTotals.NO_ACTIVE}  (⚠️ à examiner — aucune affectation active)`);
  console.log(`  MULTIPLE_ACTIVE : ${globalTotals.MULTIPLE_ACTIVE}  (⚠️ anomalie de données — plusieurs affectations actives simultanées)`);

  if (flaggedRows.length > 0) {
    const outDir = path.join(__dirname, 'data');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `reconciliation-report-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
    fs.writeFileSync(outPath, toCsv(flaggedRows), 'utf8');
    console.log(`\n📄 ${flaggedRows.length} cas à examiner écrits dans : ${outPath}`);
  } else {
    console.log('\n✅ Aucune incohérence détectée.');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ Erreur fatale :', err);
    process.exit(1);
  });
}

module.exports = { classifyStudent, groupAssignmentsByStudent };
