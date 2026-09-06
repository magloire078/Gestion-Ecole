const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'greecole'
  });
} catch (e) {
  console.log("Admin init error:", e.message);
}

const db = admin.firestore();

const studentsData = [
  {"n": 1, "name": "KONAN FAMIEN AXEL", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]},
  {"n": 2, "name": "KOFFI CHRIST MOH CHAHINA", "scolarite": 250000, "payments": [50000, 45000, 55000, 20000]},
  {"n": 3, "name": "KOUYATE EBENEZER MAÏSANE", "scolarite": 225000, "payments": [25000, 30000, 30000, 40000, 100000]},
  {"n": 4, "name": "AMANI STELLA MARIE FLORIANE", "scolarite": 250000, "payments": [50000, 50000, 50000, 50000, 50000]},
  {"n": 5, "name": "AKAPKO YAO MERVIN RAYANE", "scolarite": 250000, "payments": [50000, 50000, 50000, 50000, 50000]},
  {"n": 6, "name": "KAKOU JEREMIE", "scolarite": 250000, "payments": [50000, 50000, 50000, 0, 100000]},
  {"n": 7, "name": "ABE SYDNEY ZOE BERAKA", "scolarite": 250000, "payments": [50000, 30000, 50000]},
  {"n": 8, "name": "AYE MBOUAFOUE LIAM EMMANUEL EUNICE", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]},
  {"n": 9, "name": "DOUMBIA NAIMA BERAKA", "scolarite": 250000, "payments": [50000, 50000, 100000]},
  {"n": 10, "name": "N’GORAN MIEMOH NAIKE SERAH", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]},
  {"n": 11, "name": "KOFFI ECLOÏE ARCHANGE", "scolarite": 250000, "payments": [50000, 40000, 50000, 50000, 40000, 20000]},
  {"n": 12, "name": "N’GUESSAN LIAM NATHANAËL", "scolarite": 250000, "payments": [50000, 70000, 60000, 70000]},
  {"n": 13, "name": "KOUADIO KOUAME KAYLA", "scolarite": 250000, "payments": [50000, 50000, 50000, 50000, 50000]},
  {"n": 14, "name": "KONAN MARIE ANGE SOURALAI", "scolarite": 250000, "payments": [50000, 50000, 50000, 70000, 30000]},
  {"n": 15, "name": "AMONKOU YAEL", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]}
];

async function seed() {
  console.log("Searching for school Le Mini Monde...");
  const ecolesSnap = await db.collection('ecoles').get();
  let schoolId = null;
  let schoolName = null;
  ecolesSnap.forEach(doc => {
    if (doc.data().name && doc.data().name.toLowerCase().includes('mini monde')) {
      schoolId = doc.id;
      schoolName = doc.data().name;
    }
  });

  if (!schoolId) {
    console.log("Could not find school Le Mini Monde. Creating it...");
    const newSchoolRef = db.collection('ecoles').doc();
    await newSchoolRef.set({
      name: 'Le Mini Monde',
      address: 'Abidjan',
      contact: '0000000000',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    schoolId = newSchoolRef.id;
    schoolName = 'Le Mini Monde';
  }
  console.log(`Found school: ${schoolName} (${schoolId})`);

  console.log("Searching for class Moyenne Section - A...");
  const classesSnap = await db.collection(`ecoles/${schoolId}/classes`).get();
  let classId = null;
  let className = null;
  classesSnap.forEach(doc => {
    if (doc.data().name && doc.data().name.toLowerCase().includes('moyenne section - a')) {
      classId = doc.id;
      className = doc.data().name;
    }
  });

  if (!classId) {
    console.log("Could not find class Moyenne Section - A. Creating it...");
    const newClassRef = db.collection(`ecoles/${schoolId}/classes`).doc();
    await newClassRef.set({
      name: 'Moyenne Section - A',
      level: 'Moyenne Section',
      capacity: 30,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    classId = newClassRef.id;
    className = 'Moyenne Section - A';
  }
  console.log(`Found class: ${className} (${classId})`);

  const batch = db.batch();
  let counter = 0;

  for (const s of studentsData) {
    const parts = s.name.split(' ');
    const lastName = parts[0];
    const firstName = parts.slice(1).join(' ');

    const totalPaid = s.payments.reduce((a, b) => a + b, 0);
    const amountDue = s.scolarite - totalPaid;
    const tuitionStatus = amountDue <= 0 ? 'Soldé' : 'Partiel';

    const studentRef = db.collection(`ecoles/${schoolId}/eleves`).doc();
    batch.set(studentRef, {
      schoolId: schoolId,
      matricule: `MAT-2025-${String(s.n).padStart(3, '0')}`,
      lastName: lastName,
      firstName: firstName,
      gender: 'Masculin', // Defaulting as we don't know for all
      dateOfBirth: '2020-01-01',
      placeOfBirth: 'Abidjan',
      nationality: 'Ivoirienne',
      statusAff: 'Non-Affecté',
      isRepeater: false,
      classId: classId,
      class: className,
      grade: 'Moyenne Section - A',
      cycle: 'Préscolaire',
      parent1LastName: lastName,
      parent1FirstName: 'Parent',
      parent1Contact: '0700000000',
      status: 'Actif',
      tuitionFee: s.scolarite,
      amountDue: amountDue,
      tuitionStatus: tuitionStatus,
      inscriptionYear: 2025,
      academicYear: '2025-2026',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`Prepared student ${s.name} (${studentRef.id})`);

    // Add payments
    s.payments.forEach((amt, index) => {
      if (amt > 0) {
        const paymentRef = db.collection(`ecoles/${schoolId}/eleves/${studentRef.id}/paiements`).doc();
        batch.set(paymentRef, {
          studentId: studentRef.id,
          amount: amt,
          date: new Date().toISOString().split('T')[0],
          method: 'Espèce',
          reference: `REC-2025-${Date.now().toString().slice(-6)}-${index}`,
          academicYear: '2025-2026',
          notes: index === 0 ? 'Frais Inscription' : `Versement ${index}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    counter++;
    if (counter % 100 === 0) {
      await batch.commit();
      console.log(`Committed ${counter} students`);
    }
  }

  await batch.commit();
  console.log(`Success! Inserted ${studentsData.length} students into the database.`);
  process.exit(0);
}

seed().catch(console.error);
