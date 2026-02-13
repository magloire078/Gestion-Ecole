/**
 * Script pour définir un utilisateur comme administrateur système
 * 
 * Ce script ajoute le flag isAdmin: true à un utilisateur dans Firestore
 * 
 * Usage:
 * node scripts/set-admin-user.js votre-email@example.com
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'greecole'
    });
}

const db = admin.firestore();

async function setAdminUser(email) {
    try {
        console.log(`🔍 Recherche de l'utilisateur: ${email}...`);

        // Trouver l'utilisateur par email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
            console.log('');
            console.log('💡 Assurez-vous que:');
            console.log('   1. L\'utilisateur s\'est déjà connecté au moins une fois');
            console.log('   2. L\'email est correct (sensible à la casse)');
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        console.log(`✓ Utilisateur trouvé: ${userData.displayName || email}`);
        console.log(`  UID: ${userDoc.id}`);

        // Mettre à jour avec le flag admin
        await userDoc.ref.update({
            isAdmin: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('');
        console.log(`✅ Utilisateur ${email} défini comme administrateur système!`);
        console.log('');
        console.log('🎉 Vous pouvez maintenant accéder à:');
        console.log('   http://localhost:3001/admin/system/dashboard');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la configuration:', error);
        process.exit(1);
    }
}

// Récupérer l'email depuis les arguments
const email = process.argv[2];

if (!email) {
    console.error('❌ Usage: node scripts/set-admin-user.js <email>');
    console.log('');
    console.log('Exemple:');
    console.log('  node scripts/set-admin-user.js utilisateur@gmail.com');
    process.exit(1);
}

setAdminUser(email);
