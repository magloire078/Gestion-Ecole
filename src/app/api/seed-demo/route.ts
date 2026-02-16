import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import admin from 'firebase-admin';

export async function GET() {
    try {
        console.log('🚀 Début du peuplement via route API...');
        const batch = adminDb.batch();

        // 1. Écoles
        const ecoles = [
            {
                id: 'demo-oliviers',
                name: 'École Primaire Les Oliviers',
                status: 'active',
                directorFirstName: 'Jean',
                directorLastName: 'Kouassi',
                schoolCode: 'OLV-225',
                subscription: {
                    plan: 'Essentiel',
                    status: 'active',
                    startDate: '2025-09-01',
                    maxStudents: 200,
                    activeModules: ['sante', 'cantine']
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            },
            {
                id: 'demo-stex',
                name: 'Collège & Lycée Saint-Exupéry',
                status: 'active',
                directorFirstName: 'Marie',
                directorLastName: 'Diallo',
                schoolCode: 'STX-456',
                subscription: {
                    plan: 'Pro',
                    status: 'active',
                    startDate: '2025-09-01',
                    maxStudents: 1000,
                    activeModules: ['sante', 'cantine', 'transport', 'rh', 'immobilier']
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            },
            {
                id: 'demo-poly',
                name: 'Institut Polytechnique de l\'Indénié',
                status: 'suspended',
                directorFirstName: 'Ahmed',
                directorLastName: 'Bakayoko',
                schoolCode: 'POLY-88',
                subscription: {
                    plan: 'Premium',
                    status: 'past_due',
                    activeModules: ['sante', 'cantine', 'transport', 'internat', 'immobilier', 'activites', 'rh']
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }
        ];

        ecoles.forEach(ecole => {
            const { id, ...data } = ecole;
            batch.set(adminDb.collection('ecoles').doc(id), data);
        });

        // 2. Tickets
        const tickets = [
            {
                id: 'ticket-1',
                schoolId: 'demo-oliviers',
                subject: 'Problème de facturation',
                category: 'Finance',
                description: 'Impossible de générer les reçus.',
                status: 'open',
                submittedAt: new Date().toISOString(),
                userDisplayName: 'Jean Kouassi',
                userId: 'dummy-director-1'
            },
            {
                id: 'ticket-2',
                schoolId: 'demo-stex',
                subject: 'Formation RH',
                category: 'Formation',
                status: 'open',
                submittedAt: new Date().toISOString(),
                userDisplayName: 'Marie Diallo',
                userId: 'dummy-director-2'
            }
        ];

        tickets.forEach(ticket => {
            const { id, ...data } = ticket;
            batch.set(adminDb.collection('support_tickets').doc(id), data);
        });

        // 3. Settings
        batch.set(adminDb.collection('system_settings').doc('default'), {
            maintenanceMode: false,
            registrationEnabled: true,
            globalMessage: 'Démonstration Active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: "Données de démo injectées" });
    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
