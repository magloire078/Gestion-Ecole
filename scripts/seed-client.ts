
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Variable d'environnement manquante : ${name} (voir .env.local)`);
    }
    return value;
}

const firebaseConfig = {
    apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
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
