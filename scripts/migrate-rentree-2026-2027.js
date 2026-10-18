/**
 * Migration rentrée 2026-2027 — Le Mini Monde.
 *
 * Exécute, dans l'ordre, les 6 étapes convenues avec le client :
 *   1. cycles-niveaux : crée Garderie/Préscolaire/Primaire + leurs niveaux
 *      (idempotent — vérifie l'existence par nom avant de créer).
 *   2. classes         : crée les 8 classes 2026-2027 (idempotent par nom+année).
 *   3. promotions      : fait passer les 25 élèves revenants dans leur nouvelle
 *      classe (classId/class mis à jour, entrée inscriptions_classe créée,
 *      compteurs studentCount ajustés) + applique leurs paiements 2026-2027
 *      (mêmes 4 écritures que scripts/import-payments.js : paiements,
 *      comptabilite, amountDue/tuitionStatus, stats/finance).
 *   4. new-students    : crée les 34 élèves réellement nouveaux + leurs
 *      paiements d'inscription/versement.
 *   5. archive         : marque les 64 élèves non-revenus "Radié" (réversible,
 *      "Restaurer" depuis l'onglet Archives si besoin plus tard).
 *   6. finalize        : bascule ecoles/{id}.currentAcademicYear sur 2026-2027
 *      (seulement si encore sur 2025-2026), ajoute 2025-2026 à archivedYears,
 *      et passe les 6 classes 2025-2026 en statut "archived".
 *
 * Ne réimplémente PAS le verrou transactionnel de l'assistant "Nouvelle
 * Année" de l'app (src/lib/admin-academic-year.ts) — ce script est pensé
 * pour une exécution unique, supervisée par un humain, pas pour tourner en
 * concurrence avec quelqu'un d'autre cliquant le même bouton dans l'UI en
 * même temps. N'exécutez PAS l'assistant "Nouvelle Année" de l'UI en même
 * temps que ce script (double transition sinon).
 *
 * SÉCURITÉ : dry-run par défaut (aucune écriture). Ajoutez --apply pour
 * écrire réellement. Chaque étape est indépendamment ré-exécutable sans
 * dupliquer (vérifications d'existence avant chaque création/changement).
 *
 * Prérequis (identiques aux autres scripts de ce dossier) :
 *   - `npm install` déjà fait (firebase-admin est une dépendance du projet).
 *   - Credentials Google valides pour le projet Firebase `greecole` :
 *       soit `gcloud auth application-default login`,
 *       soit `GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json`.
 *
 * Usage :
 *   node scripts/migrate-rentree-2026-2027.js                      # dry-run, toutes les étapes
 *   node scripts/migrate-rentree-2026-2027.js --apply               # exécution réelle, toutes les étapes
 *   node scripts/migrate-rentree-2026-2027.js --apply --only=classes  # une seule étape
 *   node scripts/migrate-rentree-2026-2027.js --apply --only=promotions,new-students,archive,finalize
 *
 * Ordre recommandé en --apply, étape par étape, en vérifiant le rapport
 * entre chaque (regardez l'app après chaque étape) :
 *   cycles-niveaux -> classes -> promotions -> new-students -> archive -> finalize
 */

'use strict';

const admin = require('firebase-admin');
const DATA = require('./data/rentree-2026-2027');

const SCHOOL_NAME_QUERY = 'mini monde';
const IMPORT_BATCH_TAG = 'migration-rentree-2026-2027-v1';
const DEFAULT_METHOD = 'Espèces';
const INSCRIPTION_DATE = '2026-09-01';
const VERSEMENT_DATE = '2026-10-01';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const onlyArg = args.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;
const STEPS = ['cycles-niveaux', 'classes', 'promotions', 'new-students', 'archive', 'finalize'];
function shouldRun(step) {
  return !ONLY || ONLY.has(step);
}

function normalizeName(raw) {
  return (raw || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/0/g, 'O')
    .replace(/[^A-Z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function studentFullName(student) {
  return `${student.lastName || ''} ${student.firstName || ''}`.trim();
}

async function findSchool(db) {
  const snap = await db.collection('ecoles').get();
  const matches = [];
  snap.forEach(doc => {
    const name = (doc.data().name || '').toLowerCase();
    if (name.includes(SCHOOL_NAME_QUERY)) matches.push({ id: doc.id, name: doc.data().name, data: doc.data() });
  });
  if (matches.length === 0) throw new Error(`Aucune école ne correspond à "${SCHOOL_NAME_QUERY}".`);
  if (matches.length > 1) throw new Error(`Plusieurs écoles correspondent à "${SCHOOL_NAME_QUERY}" : ${matches.map(m => `${m.name} (${m.id})`).join(', ')}.`);
  return matches[0];
}

// ============================================================
// Étape 1 — Cycles & Niveaux
// ============================================================
async function stepCyclesNiveaux(db, schoolId) {
  console.log('\n=== Étape 1/6 : Cycles & Niveaux ===');
  const cyclesSnap = await db.collection(`ecoles/${schoolId}/cycles`).get();
  const existingCycles = new Map(cyclesSnap.docs.map(d => [normalizeName(d.data().name), { id: d.id, ...d.data() }]));

  for (const c of DATA.cyclesNiveaux) {
    let cycleId;
    const key = normalizeName(c.cycle);
    if (existingCycles.has(key)) {
      cycleId = existingCycles.get(key).id;
      console.log(`  · Cycle "${c.cycle}" existe déjà (${cycleId}).`);
    } else {
      console.log(`  + Cycle "${c.cycle}" à créer.`);
      if (APPLY) {
        const ref = db.collection(`ecoles/${schoolId}/cycles`).doc();
        await ref.set({
          schoolId, name: c.cycle, code: c.cycleCode, order: c.cycleOrder, isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        cycleId = ref.id;
        existingCycles.set(key, { id: cycleId });
      }
    }

    const niveauxSnap = cycleId ? await db.collection(`ecoles/${schoolId}/niveaux`).where('cycleId', '==', cycleId).get() : null;
    const existingNiveaux = new Set((niveauxSnap ? niveauxSnap.docs : []).map(d => normalizeName(d.data().name)));

    for (const n of c.niveaux) {
      if (existingNiveaux.has(normalizeName(n.name))) {
        console.log(`    · Niveau "${n.name}" existe déjà sous "${c.cycle}".`);
        continue;
      }
      console.log(`    + Niveau "${n.name}" à créer sous "${c.cycle}".`);
      if (APPLY && cycleId) {
        await db.collection(`ecoles/${schoolId}/niveaux`).doc().set({
          schoolId, cycleId, name: n.name, code: n.code, order: n.order,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
}

// ============================================================
// Étape 2 — Classes 2026-2027
// ============================================================
async function getClassesForYear(db, schoolId, year) {
  const snap = await db.collection(`ecoles/${schoolId}/classes`).where('academicYear', '==', year).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function stepClasses(db, schoolId) {
  console.log('\n=== Étape 2/6 : Classes 2026-2027 ===');
  const existing = await getClassesForYear(db, schoolId, DATA.toYear);
  const existingByName = new Map(existing.map(c => [normalizeName(c.name), c]));

  const niveauxSnap = await db.collection(`ecoles/${schoolId}/niveaux`).get();
  const niveauxByName = new Map(niveauxSnap.docs.map(d => [normalizeName(d.data().name), { id: d.id, ...d.data() }]));

  for (const cls of DATA.classes) {
    const key = normalizeName(cls.name);
    if (existingByName.has(key)) {
      console.log(`  · Classe "${cls.name}" (${DATA.toYear}) existe déjà (${existingByName.get(key).id}).`);
      continue;
    }
    const niveau = niveauxByName.get(normalizeName(cls.niveauName));
    if (!niveau) {
      console.error(`  ✗ Niveau "${cls.niveauName}" introuvable pour la classe "${cls.name}" — lancez d'abord --only=cycles-niveaux --apply.`);
      continue;
    }
    console.log(`  + Classe "${cls.name}" à créer (niveau ${cls.niveauName}, cycle ${niveau.cycleId}).`);
    if (APPLY) {
      const ref = db.collection(`ecoles/${schoolId}/classes`).doc();
      await ref.set({
        schoolId, name: cls.name, code: cls.code, cycleId: niveau.cycleId, niveauId: niveau.id,
        academicYear: DATA.toYear, studentCount: 0, maxStudents: cls.maxStudents,
        status: 'active', isFull: false, createdBy: 'migration-script',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      existingByName.set(key, { id: ref.id, name: cls.name });
    }
  }
}

// ============================================================
// Recherche d'un élève par nom dans une classe donnée (toute année)
// ============================================================
async function findStudentByNameInClassName(db, schoolId, className, fullName) {
  const classesSnap = await db.collection(`ecoles/${schoolId}/classes`).where('name', '==', className).get();
  const target = normalizeName(fullName);
  for (const classDoc of classesSnap.docs) {
    const studentsSnap = await db.collection(`ecoles/${schoolId}/eleves`).where('classId', '==', classDoc.id).get();
    for (const s of studentsSnap.docs) {
      const student = { id: s.id, ...s.data() };
      if (normalizeName(studentFullName(student)) === target) {
        return { student, classDoc: { id: classDoc.id, ...classDoc.data() } };
      }
    }
  }
  return null;
}

async function applyPaymentEntries(db, schoolId, student, entries, newAmountDue) {
  const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';
  const payerFirstName = student.parent1FirstName || 'Parent';
  const payerLastName = student.parent1LastName || '';
  const payerContact = student.parent1Contact || '';
  const totalPaid = entries.reduce((s, e) => s + e.amount, 0);

  const batch = db.batch();
  for (const entry of entries) {
    const accountingRef = db.collection(`ecoles/${schoolId}/comptabilite`).doc();
    batch.set(accountingRef, {
      schoolId, studentId: student.id, date: entry.date,
      description: `${entry.description} - ${student.firstName || ''} ${student.lastName || ''}`.trim(),
      category: 'Scolarité', type: 'Revenu', amount: entry.amount, academicYear: DATA.toYear,
      importBatch: IMPORT_BATCH_TAG, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const paymentRef = db.collection(`ecoles/${schoolId}/eleves/${student.id}/paiements`).doc();
    batch.set(paymentRef, {
      schoolId, studentId: student.id, date: entry.date, amount: entry.amount, description: entry.description,
      accountingTransactionId: accountingRef.id, payerFirstName, payerLastName, payerContact,
      method: DEFAULT_METHOD, academicYear: DATA.toYear, importBatch: IMPORT_BATCH_TAG,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  batch.update(db.doc(`ecoles/${schoolId}/eleves/${student.id}`), {
    amountDue: newAmountDue, tuitionStatus: newStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(`ecoles/${schoolId}/stats/finance`), {
    totalAmountDue: admin.firestore.FieldValue.increment(-totalPaid),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

function buildEntries(row) {
  const entries = [];
  if (row.inscription > 0) entries.push({ amount: row.inscription, description: "Frais d'inscription", date: INSCRIPTION_DATE });
  if (row.versement > 0) entries.push({ amount: row.versement, description: '1er versement', date: VERSEMENT_DATE });
  return entries;
}

// ============================================================
// Étape 3 — Promotions (25 élèves revenants)
// ============================================================
async function stepPromotions(db, schoolId) {
  console.log('\n=== Étape 3/6 : Promotions (25 élèves revenants) ===');
  const targetClasses = await getClassesForYear(db, schoolId, DATA.toYear);
  const targetByName = new Map(targetClasses.map(c => [normalizeName(c.name), c]));

  for (const p of DATA.promotions) {
    const found = await findStudentByNameInClassName(db, schoolId, p.fromClass, p.fromName);
    if (!found) {
      console.error(`  ✗ "${p.fromName}" introuvable dans la classe "${p.fromClass}" — à traiter manuellement.`);
      continue;
    }
    const { student, classDoc: fromClassDoc } = found;

    // Déjà promu lors d'un run précédent ?
    if (student.classId && targetByName.get(normalizeName(p.toClass)) && student.classId === targetByName.get(normalizeName(p.toClass)).id) {
      console.log(`  · "${p.fromName}" déjà promu vers "${p.toClass}" — ignoré.`);
      continue;
    }

    const targetClass = targetByName.get(normalizeName(p.toClass));
    if (!targetClass) {
      console.error(`  ✗ Classe cible "${p.toClass}" introuvable (${DATA.toYear}) — lancez d'abord --only=classes --apply.`);
      continue;
    }

    console.log(`  → "${studentFullName(student)}" (${student.id}) : ${p.fromClass} -> ${p.toClass}, scolarité ${p.tuitionFee.toLocaleString('fr-FR')} FCFA, reste ${p.amountDue.toLocaleString('fr-FR')} FCFA.`);

    if (APPLY) {
      const batch = db.batch();
      batch.update(db.doc(`ecoles/${schoolId}/eleves/${student.id}`), {
        classId: targetClass.id, class: targetClass.name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      if (fromClassDoc.id) {
        batch.update(db.doc(`ecoles/${schoolId}/classes/${fromClassDoc.id}`), {
          studentCount: admin.firestore.FieldValue.increment(-1),
        });
      }
      batch.update(db.doc(`ecoles/${schoolId}/classes/${targetClass.id}`), {
        studentCount: admin.firestore.FieldValue.increment(1),
      });

      // Clôture de l'affectation précédente (si trouvée via inscriptions_classe).
      const prevAssignSnap = await db.collection(`ecoles/${schoolId}/inscriptions_classe`)
        .where('studentId', '==', student.id).where('status', '==', 'active').get();
      prevAssignSnap.forEach(d => batch.update(d.ref, { status: 'transferred', endDate: INSCRIPTION_DATE }));

      const assignRef = db.collection(`ecoles/${schoolId}/inscriptions_classe`).doc();
      batch.set(assignRef, {
        schoolId, studentId: student.id, classeId: targetClass.id, academicYear: DATA.toYear,
        startDate: INSCRIPTION_DATE, promotionType: 'normal', status: 'active',
        createdBy: 'migration-script', previousClass: fromClassDoc.name, className: targetClass.name,
        createdAt: new Date().toISOString(),
      });
      await batch.commit();

      const entries = buildEntries(p);
      if (entries.length > 0) {
        await applyPaymentEntries(db, schoolId, { ...student, id: student.id }, entries, p.amountDue);
      }
    }
  }
}

// ============================================================
// Étape 4 — Nouveaux élèves (34)
// ============================================================
async function stepNewStudents(db, schoolId) {
  console.log('\n=== Étape 4/6 : Nouveaux élèves (34) ===');
  const targetClasses = await getClassesForYear(db, schoolId, DATA.toYear);
  const targetByName = new Map(targetClasses.map(c => [normalizeName(c.name), c]));

  for (const s of DATA.newStudents) {
    // Déjà importé lors d'un run précédent ? (recherche par matricule)
    const existingSnap = await db.collection(`ecoles/${schoolId}/eleves`).where('matricule', '==', s.matricule).limit(1).get();
    if (!existingSnap.empty) {
      console.log(`  · ${s.matricule} (${s.lastName} ${s.firstName}) déjà importé — ignoré.`);
      continue;
    }
    const targetClass = targetByName.get(normalizeName(s.className));
    if (!targetClass) {
      console.error(`  ✗ Classe "${s.className}" introuvable (${DATA.toYear}) pour ${s.matricule} — lancez d'abord --only=classes --apply.`);
      continue;
    }

    console.log(`  + ${s.matricule} : ${s.lastName} ${s.firstName} (${s.gender}) -> ${s.className}, scolarité ${s.tuitionFee.toLocaleString('fr-FR')} FCFA.`);

    if (APPLY) {
      const studentRef = db.collection(`ecoles/${schoolId}/eleves`).doc();
      const genderFull = s.gender === 'M' ? 'Masculin' : 'Féminin';
      await studentRef.set({
        schoolId, firstName: s.firstName, lastName: s.lastName, gender: genderFull,
        classId: targetClass.id, class: targetClass.name, matricule: s.matricule,
        status: 'Actif', tuitionFee: s.tuitionFee, amountDue: s.amountDue,
        tuitionStatus: s.amountDue <= 0 ? 'Soldé' : 'Partiel',
        inscriptionYear: DATA.toYear, academicYear: DATA.toYear,
        enrollments: [{
          academicYear: DATA.toYear, classId: targetClass.id, status: 'Nouveau',
          tuitionFee: s.tuitionFee, amountDue: s.amountDue, tuitionStatus: s.amountDue <= 0 ? 'Soldé' : 'Partiel',
          createdAt: new Date().toISOString(), createdBy: 'migration-script',
        }],
        importBatch: IMPORT_BATCH_TAG,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.doc(`ecoles/${schoolId}/classes/${targetClass.id}`).update({ studentCount: admin.firestore.FieldValue.increment(1) });

      const assignRef = db.collection(`ecoles/${schoolId}/inscriptions_classe`).doc();
      await assignRef.set({
        schoolId, studentId: studentRef.id, classeId: targetClass.id, academicYear: DATA.toYear,
        startDate: INSCRIPTION_DATE, promotionType: 'normal', status: 'active',
        createdBy: 'migration-script', className: targetClass.name, createdAt: new Date().toISOString(),
      });

      const entries = buildEntries(s);
      if (entries.length > 0) {
        await applyPaymentEntries(db, schoolId, { id: studentRef.id, firstName: s.firstName, lastName: s.lastName }, entries, s.amountDue);
      }
    }
  }
}

// ============================================================
// Étape 5 — Archivage des 64 non-revenants
// ============================================================
async function stepArchive(db, schoolId) {
  console.log('\n=== Étape 5/6 : Archivage des non-revenants (64) ===');
  for (const a of DATA.archive) {
    const found = await findStudentByNameInClassName(db, schoolId, a.classe, a.fullname);
    if (!found) {
      console.error(`  ✗ "${a.fullname}" introuvable dans "${a.classe}" — à vérifier manuellement.`);
      continue;
    }
    const { student, classDoc } = found;
    if (student.status === 'Radié') {
      console.log(`  · "${a.fullname}" déjà radié — ignoré.`);
      continue;
    }
    console.log(`  → "${studentFullName(student)}" (${student.id}) : Radié.`);
    if (APPLY) {
      const batch = db.batch();
      batch.update(db.doc(`ecoles/${schoolId}/eleves/${student.id}`), {
        status: 'Radié', updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      if (classDoc.id) {
        batch.update(db.doc(`ecoles/${schoolId}/classes/${classDoc.id}`), {
          studentCount: admin.firestore.FieldValue.increment(-1),
        });
      }
      await batch.commit();
    }
  }
}

// ============================================================
// Étape 6 — Finalisation (bascule d'année + archivage des classes 2025-2026)
// ============================================================
async function stepFinalize(db, schoolId, school) {
  console.log('\n=== Étape 6/6 : Finalisation ===');
  const current = school.data.currentAcademicYear;
  if (current === DATA.toYear) {
    console.log(`  · currentAcademicYear déjà sur ${DATA.toYear} — rien à faire sur l'école.`);
  } else if (current !== DATA.fromYear) {
    console.warn(`  ⚠ currentAcademicYear = "${current}" (ni ${DATA.fromYear} ni ${DATA.toYear}) — bascule NON appliquée automatiquement, vérifiez manuellement.`);
  } else {
    const archivedYears = Array.isArray(school.data.archivedYears) ? [...school.data.archivedYears] : [];
    if (!archivedYears.includes(DATA.fromYear)) archivedYears.push(DATA.fromYear);
    console.log(`  + currentAcademicYear : ${DATA.fromYear} -> ${DATA.toYear}`);
    console.log(`  + archivedYears : ${JSON.stringify(archivedYears)}`);
    if (APPLY) {
      await db.doc(`ecoles/${schoolId}`).update({
        currentAcademicYear: DATA.toYear, archivedYears,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  const oldClasses = await getClassesForYear(db, schoolId, DATA.fromYear);
  for (const c of oldClasses) {
    if (c.status === 'archived') {
      console.log(`  · Classe "${c.name}" (${DATA.fromYear}) déjà archivée.`);
      continue;
    }
    console.log(`  + Classe "${c.name}" (${DATA.fromYear}) -> statut "archived".`);
    if (APPLY) {
      await db.doc(`ecoles/${schoolId}/classes/${c.id}`).update({
        status: 'archived', updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

// ============================================================
async function main() {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'greecole' });
  const db = admin.firestore();

  console.log(APPLY
    ? '🚨 MODE RÉEL (--apply) : les écritures ci-dessous vont être appliquées à Firestore.'
    : '🧪 MODE DRY-RUN (par défaut) : aucune écriture ne sera faite. Relancez avec --apply pour exécuter.');
  if (ONLY) console.log(`Étapes sélectionnées : ${[...ONLY].join(', ')}`);

  const school = await findSchool(db);
  console.log(`École trouvée : ${school.name} (${school.id}) — currentAcademicYear = ${school.data.currentAcademicYear}\n`);

  if (shouldRun('cycles-niveaux')) await stepCyclesNiveaux(db, school.id);
  if (shouldRun('classes')) await stepClasses(db, school.id);
  if (shouldRun('promotions')) await stepPromotions(db, school.id);
  if (shouldRun('new-students')) await stepNewStudents(db, school.id);
  if (shouldRun('archive')) await stepArchive(db, school.id);
  if (shouldRun('finalize')) await stepFinalize(db, school.id, school);

  console.log(APPLY
    ? '\n✅ Exécution terminée.'
    : '\n🧪 Dry-run terminé — AUCUNE écriture faite. Relancez avec --apply pour exécuter réellement.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ Erreur fatale :', err);
    process.exit(1);
  });
}

module.exports = { normalizeName, studentFullName };
