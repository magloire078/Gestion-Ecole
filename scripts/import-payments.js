require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, setDoc, updateDoc, arrayUnion, serverTimestamp } = require('firebase/firestore');

// Initialize Firebase Client
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data to import
const paymentsData = require('./data/paiements-2024-2025');

async function runImport() {
  const schoolId = 'ecole_minimonde_id'; // FIXME: Récupérer le bon ID de l'école
  
  // 1. Get School ID
  console.log("Recherche de l'école Le Mini Monde...");
  const ecolesSnap = await getDocs(collection(db, 'ecoles'));
  let actualSchoolId = null;
  ecolesSnap.forEach(d => {
    if (d.data().name && d.data().name.toLowerCase().includes('mini monde')) {
      actualSchoolId = d.id;
    }
  });

  if (!actualSchoolId) {
    console.error("École introuvable.");
    return;
  }
  console.log(`École trouvée: ${actualSchoolId}`);

  let counter = 0;
  for (const record of paymentsData) {
    // 2. Trouver l'élève
    let studentQuery;
    if (record.matricule) {
      studentQuery = query(collection(db, `ecoles/${actualSchoolId}/eleves`), where('matricule', '==', record.matricule));
    } else {
      const parts = record.name.split(' ');
      const lastName = parts[0];
      const firstName = parts.slice(1).join(' ');
      studentQuery = query(
        collection(db, `ecoles/${actualSchoolId}/eleves`), 
        where('lastName', '==', lastName),
        where('firstName', '==', firstName)
      );
    }

    const studentSnap = await getDocs(studentQuery);
    if (studentSnap.empty) {
      console.log(`⚠️ Élève non trouvé: ${record.name || record.matricule}`);
      continue;
    }

    const studentDoc = studentSnap.docs[0];
    const studentRef = studentDoc.ref;
    const studentId = studentDoc.id;

    console.log(`Traitement de l'élève: ${record.name || record.matricule} (${studentId})`);

    // 3. Calculer les paiements et le reste à payer pour l'année 2024-2025
    const totalPaid = record.payments.reduce((sum, p) => sum + p.amount, 0);
    const amountDue = record.scolarite - totalPaid;
    const tuitionStatus = amountDue <= 0 ? 'Soldé' : (totalPaid > 0 ? 'Partiel' : 'Non payé');

    // 4. Ajouter l'historique d'inscription (enrollment)
    const enrollment = {
      academicYear: '2024-2025',
      classId: record.oldClassId || 'inconnu',
      className: record.oldClassName || 'Inconnue',
      status: 'Promu',
      tuitionFee: record.scolarite,
      amountDue: amountDue,
      tuitionStatus: tuitionStatus,
      createdAt: new Date().toISOString()
    };

    // Update the student document to push the enrollment history
    await updateDoc(studentRef, {
      enrollments: arrayUnion(enrollment)
    });
    console.log(`  -> Historique 2024-2025 ajouté.`);

    // 5. Insérer les paiements dans la comptabilité
    for (const payment of record.payments) {
      const transactionRef = doc(collection(db, `ecoles/${actualSchoolId}/comptabilite`));
      await setDoc(transactionRef, {
        schoolId: actualSchoolId,
        studentId: studentId,
        date: payment.date,
        description: `Paiement scolarité ${record.name}`,
        category: 'Scolarité',
        type: 'Revenu',
        amount: payment.amount,
        academicYear: '2024-2025',
        method: payment.method || 'Espèces',
        createdAt: serverTimestamp()
      });
      console.log(`  -> Transaction de ${payment.amount} ajoutée.`);
    }
    
    counter++;
  }

  console.log(`\nImport terminé ! ${counter} élèves traités.`);
  process.exit(0);
}

runImport().catch(console.error);
