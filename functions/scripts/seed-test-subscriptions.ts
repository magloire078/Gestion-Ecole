/**
 * Crée 4 écoles fictives avec différents `subscription.endDate` pour tester
 * la fonction `subscriptionLifecycle` et la page `/admin/system/subscriptions`.
 *
 * Authentification :
 *   - Soit GOOGLE_APPLICATION_CREDENTIALS pointant vers un service account JSON
 *   - Soit `gcloud auth application-default login` au préalable
 *   - Soit FIREBASE_PROJECT_ID + service account discoverable
 *
 * Usage :
 *   cd functions
 *   npx ts-node scripts/seed-test-subscriptions.ts [--project=mon-projet]
 *
 * Pour supprimer les écoles de test ensuite :
 *   npx ts-node scripts/seed-test-subscriptions.ts --cleanup
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { addDays } from 'date-fns';

const projectArg = process.argv.find(a => a.startsWith('--project='))?.split('=')[1];
const cleanup = process.argv.includes('--cleanup');

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: projectArg || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
    });
}

const db = getFirestore();

const FIXTURES = [
    { id: 'test-school-d10', name: '[TEST] École J-10', daysFromNow: 10, plan: 'Pro' },
    { id: 'test-school-d5', name: '[TEST] École J-5', daysFromNow: 5, plan: 'Pro' },
    { id: 'test-school-d2', name: '[TEST] École J-2', daysFromNow: 2, plan: 'Premium' },
    { id: 'test-school-expired', name: '[TEST] École expirée', daysFromNow: -3, plan: 'Pro' },
];

async function seed() {
    const now = new Date();
    for (const fx of FIXTURES) {
        const endDate = addDays(now, fx.daysFromNow).toISOString();
        await db.collection('ecoles').doc(fx.id).set({
            name: fx.name,
            directorEmail: 'director-test@example.com',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            subscription: {
                plan: fx.plan,
                status: 'active',
                endDate,
                remindersSent: {},
            },
        }, { merge: true });
        console.log(`✓ Créé ${fx.id} → ${fx.name} (${fx.daysFromNow >= 0 ? `J+${fx.daysFromNow}` : `J${fx.daysFromNow}`})`);
    }
    console.log(`\nDone. Ouvre /admin/system/subscriptions pour les visualiser.`);
}

async function cleanupFixtures() {
    for (const fx of FIXTURES) {
        await db.collection('ecoles').doc(fx.id).delete();
        console.log(`✗ Supprimé ${fx.id}`);
    }
}

(async () => {
    try {
        if (cleanup) {
            await cleanupFixtures();
        } else {
            await seed();
        }
        process.exit(0);
    } catch (err) {
        console.error('[seed] Erreur :', err);
        process.exit(1);
    }
})();
