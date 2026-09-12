
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

async function seedLocal() {
    console.log('🚀 Début du peuplement local (SDK standard)...');
    const batch = writeBatch(db);

    try {
        // 1. Écoles
        const ecoles = [
            {
                id: 'demo-oliviers',
                name: 'École Primaire Les Oliviers',
                status: 'active',
                schoolCode: 'OLV-225',
                subscription: {
                    plan: 'Essentiel',
                    status: 'active',
                    startDate: '2025-09-01',
                    maxStudents: 200,
                    activeModules: ['sante', 'cantine']
                }
            },
            {
                id: 'demo-stex',
                name: 'Collège & Lycée Saint-Exupéry',
                status: 'active',
                schoolCode: 'STX-456',
                subscription: {
                    plan: 'Pro',
                    status: 'active',
                    startDate: '2025-09-01',
                    maxStudents: 1000,
                    activeModules: ['sante', 'cantine', 'transport', 'rh', 'immobilier']
                }
            }
        ];

        ecoles.forEach(ecole => {
            const { id, ...data } = ecole;
            batch.set(doc(db, 'ecoles', id), { ...data, createdAt: serverTimestamp() });
        });

        // 2. Settings
        batch.set(doc(db, 'system_settings', 'default'), {
            maintenanceMode: false,
            registrationEnabled: true,
            globalMessage: 'Démonstration Locale Active',
            updatedAt: serverTimestamp()
        });

        await batch.commit();
        console.log('✅ Peuplement local réussi !');
    } catch (error) {
        console.error('❌ Erreur lors du peuplement local:', error);
    }
}

seedLocal();
