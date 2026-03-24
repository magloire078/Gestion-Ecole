// Firebase Admin SDK pour les webhooks et opérations serveur
import admin from 'firebase-admin';

// Configuration de base
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'greecole';

// Initialiser Firebase Admin de manière sécurisée (Lazy Loading)
function getAdminApp() {
    if (!admin.apps.length) {
        try {
            // Environnement Vercel / CI : on évite les lookups de métadonnées GCP qui font échouer le build
            const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

            if (isBuild) {
                console.log('⚠️ Build-time: Initialisation de Firebase Admin en mode limité.');
                admin.initializeApp({ projectId });
            } else {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: projectId,
                });
                console.log(`✅ Firebase Admin initialisé pour le projet: ${projectId}`);
            }
        } catch (error: any) {
            console.warn('⚠️  INFO: Les identifiants par défaut ne sont pas disponibles. L\'accès admin sera limité.');
            // Fallback d'initialisation minimale pour ne pas crash
            if (!admin.apps.length) {
                admin.initializeApp({ projectId });
            }
        }
    }
    return admin;
}

// Utilisation de getters pour éviter l'initialisation au top-level pendant le build
export const getAdminDb = () => getAdminApp().firestore();
export const getAdminAuth = () => getAdminApp().auth();

// Rétrocompatibilité (attention : peut trigger l'init au premier import s'il est utilisé comme valeur)
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;

export default admin;
