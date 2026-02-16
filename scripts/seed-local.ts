
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
