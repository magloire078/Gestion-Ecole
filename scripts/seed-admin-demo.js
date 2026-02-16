/**
 * Script de peuplement pour les données de démonstration Admin Système
 * 
 * Usage: node scripts/seed-admin-demo.js
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

async function seedAdminDemo() {
    console.log('🚀 Début du peuplement des données de démo Admin Système...');

    try {
        const batch = db.batch();

        // 1. Écoles de Démonstration
        const ecoles = [
            {
                id: 'demo-oliviers',
                name: 'École Primaire Les Oliviers',
                drena: 'Abidjan 1',
                status: 'active',
                directorFirstName: 'Jean',
                directorLastName: 'Kouassi',
                schoolCode: 'OLV-225',
                subscription: {
                    plan: 'Essentiel',
                    status: 'active',
                    startDate: '2025-09-01',
                    endDate: '2026-08-31',
                    maxStudents: 200,
                    activeModules: ['sante', 'cantine']
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            },
            {
                id: 'demo-stex',
                name: 'Collège & Lycée Saint-Exupéry',
                drena: 'Yamoussoukro',
                status: 'active',
                directorFirstName: 'Marie',
                directorLastName: 'Diallo',
                schoolCode: 'STX-456',
                subscription: {
                    plan: 'Pro',
                    status: 'active',
                    startDate: '2025-09-01',
                    endDate: '2026-08-31',
                    maxStudents: 1000,
                    activeModules: ['sante', 'cantine', 'transport', 'rh', 'immobilier']
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            },
            {
                id: 'demo-poly',
                name: 'Institut Polytechnique de l\'Indénié',
                drena: 'Abengourou',
                status: 'suspended',
                directorFirstName: 'Ahmed',
                directorLastName: 'Bakayoko',
                schoolCode: 'POLY-88',
                subscription: {
                    plan: 'Premium',
                    status: 'past_due',
                    startDate: '2025-01-01',
                    endDate: '2025-12-31',
                    activeModules: ['sante', 'cantine', 'transport', 'internat', 'immobilier', 'activites', 'rh']
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }
        ];

        ecoles.forEach(ecole => {
            const { id, ...data } = ecole;
            const ref = db.collection('ecoles').doc(id);
            batch.set(ref, data);
        });

        // 2. Tickets de Support
        const tickets = [
            {
                id: 'ticket-1',
                schoolId: 'demo-oliviers',
                subject: 'Problème de facturation',
                category: 'Finance',
                description: 'Je ne parviens pas à générer le reçu pour le mois de Février.',
                status: 'open',
                submittedAt: new Date().toISOString(),
                userDisplayName: 'Jean Kouassi',
                userEmail: 'j.kouassi@oliviers.com'
            },
            {
                id: 'ticket-2',
                schoolId: 'demo-stex',
                subject: 'Demande de formation RH',
                category: 'Formation',
                description: 'Nous aimerions une session de formation pour notre équipe administrative sur le nouveau module RH.',
                status: 'open',
                submittedAt: new Date().toISOString(),
                userDisplayName: 'Marie Diallo',
                userEmail: 'm.diallo@stex.net'
            }
        ];

        tickets.forEach(ticket => {
            const { id, ...data } = ticket;
            const ref = db.collection('support_tickets').doc(id);
            batch.set(ref, data);
        });

        // 3. Logs Système
        const logs = [
            {
                adminId: 'system-bot',
                action: 'school.suspend',
                target: 'ecoles/demo-poly',
                details: { reason: 'payment_overdue' },
                timestamp: new Date().toISOString()
            },
            {
                adminId: 'super-admin',
                action: 'plan.upgrade',
                target: 'ecoles/demo-stex',
                details: { from: 'Essentiel', to: 'Pro' },
                timestamp: new Date().toISOString()
            }
        ];

        logs.forEach(log => {
            db.collection('system_logs').add(log); // Note: add is fine for logs, no need for batch if no ID
        });

        // 4. Settings Globaux
        const settingsRef = db.collection('system_settings').doc('default');
        batch.set(settingsRef, {
            maintenanceMode: false,
            registrationEnabled: true,
            defaultSchoolPlan: 'Essentiel',
            globalMessage: 'Bienvenue sur la plateforme GéréeEcole. Mise à jour prévue ce dimanche.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        console.log('✅ Données de démo Admin Système peuplées avec succès !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors du peuplement:', error);
        process.exit(1);
    }
}

seedAdminDemo();
