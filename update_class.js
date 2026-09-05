const admin = require('firebase-admin');

try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  console.log("Erreur d'initialisation Admin :", e.message);
  console.log("Veuillez vous assurer que le fichier serviceAccountKey.json est présent à la racine du projet.");
  process.exit(1);
}

const db = admin.firestore();

async function update() {
  console.log("Recherche de l'école Le Mini Monde...");
  const ecolesSnap = await db.collection('ecoles').get();
  let schoolId = null;
  ecolesSnap.forEach(doc => {
    if (doc.data().name && doc.data().name.toLowerCase().includes('mini monde')) {
      schoolId = doc.id;
    }
  });

  if (!schoolId) return console.log("École non trouvée.");
  console.log("École trouvée:", schoolId);

  console.log("Recherche de la classe Moyenne Section - A...");
  const classesSnap = await db.collection(`ecoles/${schoolId}/classes`).get();
  let newClassId = null;
  let newClassName = null;
  classesSnap.forEach(doc => {
    if (doc.data().name && doc.data().name.toLowerCase().includes('moyenne section - a')) {
      newClassId = doc.id;
      newClassName = doc.data().name;
    }
  });

  if (!newClassId) {
    console.log("Classe 'Moyenne Section - A' introuvable. Création de la classe...");
    const classRef = await db.collection(`ecoles/${schoolId}/classes`).add({
      name: 'Moyenne Section - A',
      level: 'Moyenne Section',
      cycle: 'Préscolaire',
      capacity: 30,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    newClassId = classRef.id;
    newClassName = 'Moyenne Section - A';
  }
  console.log("Classe cible:", newClassName, "(", newClassId, ")");

  const batch = db.batch();
  
  // Les matricules des 15 élèves ajoutés
  const matricules = Array.from({length: 15}, (_, i) => `MAT-2025-${String(i + 1).padStart(3, '0')}`);
  
  const elevesSnap = await db.collection(`ecoles/${schoolId}/eleves`)
    .where('matricule', 'in', matricules)
    .get();

  console.log(`Trouvé ${elevesSnap.size} élèves à mettre à jour.`);

  elevesSnap.forEach(doc => {
    batch.update(doc.ref, {
      class: newClassName,
      classId: newClassId
    });
  });

  if (elevesSnap.size > 0) {
    await batch.commit();
    console.log("Mise à jour réussie pour", elevesSnap.size, "élèves.");
  } else {
    console.log("Aucun élève trouvé à mettre à jour.");
  }
}

update().catch(console.error);
