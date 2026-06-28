const admin = require('firebase-admin');

async function main() {
    try {
        admin.initializeApp({
            projectId: 'greecole'
        });
        const db = admin.firestore();
        console.log("Firebase Admin initialized.");
        const snapshot = await db.collection('ecoles').get();
        console.log(`Found ${snapshot.size} schools.`);
        snapshot.forEach(doc => {
            console.log(`School ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    } catch (e) {
        console.error("Error inspecting database:", e);
    }
}

main();
