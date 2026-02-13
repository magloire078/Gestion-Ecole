/**
 * Script pour configurer les paramètres système dans Firestore
 * 
 * Ce script crée le document system_settings/default nécessaire
 * pour activer les différents providers de paiement dans l'UI.
 * 
 * Usage:
 * 1. Assurez-vous que Firebase Admin est configuré
 * 2. Exécutez: node scripts/configure-payment-providers.js
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin (si pas déjà fait)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'greecole'
    });
}

const db = admin.firestore();

async function configurePaymentProviders() {
    try {
        console.log('🔧 Configuration des providers de paiement...');

        const settingsRef = db.collection('system_settings').doc('default');

        await settingsRef.set({
            paymentProviders: {
                genius: true,      // ✅ Genius Pay activé
                wave: true,        // ✅ Wave activé
                orangeMoney: false, // ❌ Orange Money désactivé
                paydunya: false,   // ❌ PayDunya désactivé
                mtn: false,        // ❌ MTN désactivé
                stripe: false      // ❌ Stripe désactivé
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system-script'
        }, { merge: true });

        console.log('✅ Configuration réussie!');
        console.log('');
        console.log('Providers activés:');
        console.log('  - Genius Pay ✓');
        console.log('  - Wave ✓');
        console.log('');
        console.log('Vous pouvez maintenant voir le bouton "Payer avec Genius Pay" dans l\'interface.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la configuration:', error);
        process.exit(1);
    }
}

configurePaymentProviders();
