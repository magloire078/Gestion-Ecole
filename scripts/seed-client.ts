
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAmhQB4yUoskfJIoBme4OStNkpGzXUxR7c",
    authDomain: "greecole.firebaseapp.com",
    projectId: "greecole",
    storageBucket: "greecole.firebasestorage.app",
    messagingSenderId: "97019754371",
    appId: "1:97019754371:web:4822d9c017bf4be808e8b6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
    console.log('🚀 Début du seeding client...');
    const batch = writeBatch(db);

    try {
        // 1. Écoles
        const ecoles = [
            { id: 'demo-oliviers', name: 'Les Oliviers', status: 'active', schoolCode: 'OLV-1' },
            { id: 'demo-stex', name: 'Saint-Exupéry', status: 'active', schoolCode: 'STX-1' }
        ];

        ecoles.forEach(e => {
            const ref = doc(collection(db, 'ecoles'), e.id);
            batch.set(ref, { ...e, createdAt: serverTimestamp() });
        });

        // 2. Settings
        const settingsRef = doc(db, 'system_settings', 'default');
        batch.set(settingsRef, {
            maintenanceMode: false,
            registrationEnabled: true,
            updatedAt: serverTimestamp()
        });

        await batch.commit();
        console.log('✅ Seeding réussi !');
    } catch (err) {
        console.error('❌ Erreur:', err);
    }
}

seed();
