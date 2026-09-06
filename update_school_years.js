const admin = require('firebase-admin');

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'greecole'
  });
} catch (e) {
  console.log("Admin init error:", e.message);
}

const db = admin.firestore();

async function addArchivedYears() {
  const ecolesSnap = await db.collection('ecoles').get();
  let schoolRef = null;
  
  ecolesSnap.forEach(doc => {
    if (doc.data().name && doc.data().name.toLowerCase().includes('mini monde')) {
      schoolRef = doc.ref;
    }
  });

  if (!schoolRef) {
    console.error("Could not find school Le Mini Monde.");
    process.exit(1);
  }

  await schoolRef.update({
    archivedYears: admin.firestore.FieldValue.arrayUnion('2023-2024', '2024-2025')
  });

  console.log("Successfully added 2023-2024 and 2024-2025 to archivedYears!");
  process.exit(0);
}

addArchivedYears().catch(console.error);
