// Firebase Admin SDK pour les webhooks et opérations serveur
import admin from 'firebase-admin';

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'greecole';

        // Tentative d'initialisation avec les identifiants par défaut de l'application
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: projectId,
        });
        console.log(`✅ Firebase Admin initialisé pour le projet: ${projectId}`);
    } catch (error: any) {
        console.error('❌ Erreur d\'initialisation de Firebase Admin:', error.message);
        if (error.message.includes('Could not load the default credentials')) {
            console.warn('⚠️  INFO: Les identifiants par défaut ne sont pas disponibles. L\'accès admin sera limité.');
        }
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
