'use client';

import { doc, writeBatch, serverTimestamp, Firestore, collection } from "firebase/firestore";

/**
 * Peuple la base de données avec des données de démonstration pour le système global.
 * @param firestore - L'instance de Firestore.
 * @param adminId - L'ID de l'administrateur qui effectue l'action.
 */
export const seedAdminSystemData = async (
    firestore: Firestore,
    adminId: string
): Promise<void> => {
    const batch = writeBatch(firestore);

    try {
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
                }
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
                }
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
                }
            }
        ];

        ecoles.forEach(ecole => {
            const { id, ...data } = ecole;
            const ref = doc(firestore, `ecoles/${id}`);
            batch.set(ref, { ...data, createdAt: serverTimestamp() }, { merge: true });
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
            const ref = doc(firestore, `support_tickets/${id}`);
            batch.set(ref, data, { merge: true });
        });

        // 3. Log Initial
        const logRef = doc(collection(firestore, 'system_logs'));
        batch.set(logRef, {
            adminId: adminId,
            action: 'system.demo-seed',
            target: 'system',
            details: { count: ecoles.length },
            timestamp: new Date().toISOString()
        });

        // 4. Settings Globaux
        const settingsRef = doc(firestore, 'system_settings/default');
        batch.set(settingsRef, {
            maintenanceMode: false,
            registrationEnabled: true,
            defaultSchoolPlan: 'Essentiel',
            globalMessage: 'Bienvenue sur la plateforme Gérécole. Mise à jour prévue ce dimanche.',
            supportWhatsApp: '+2250102030405',
            updatedAt: serverTimestamp()
        }, { merge: true });

        // 5. Liaison de l'Admin aux écoles de démo
        const userRef = doc(firestore, `users/${adminId}`);
        batch.update(userRef, {
            'schools.demo-oliviers': 'directeur',
            'schools.demo-stex': 'directeur',
            'schools.demo-poly': 'directeur',
            activeSchoolId: 'demo-oliviers'
        });

        await batch.commit();
        console.log('✅ Données de démo Admin Système peuplées via le client !');

    } catch (error) {
        console.error('❌ Erreur lors du peuplement client:', error);
        throw error;
    }
};
