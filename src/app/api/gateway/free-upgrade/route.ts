import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { getPlanLimits } from '@/lib/subscription-plans';
import { addMonths } from 'date-fns';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { schoolId, plan } = body;

        if (!schoolId || !plan) {
            return NextResponse.json({ error: "schoolId et plan sont requis." }, { status: 400 });
        }

        const planLimits = getPlanLimits(plan);
        const isTrulyFreePlan = planLimits?.pricePerStudent === 0;

        if (!isTrulyFreePlan) {
            return NextResponse.json({ error: "Ce plan n'est pas un plan gratuit." }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const endDate = addMonths(new Date(), 1).toISOString(); // Par défaut 1 mois pour le gratuit

        await adminDb.doc(`ecoles/${schoolId}`).update({
            'subscription.plan': plan,
            'subscription.status': 'active',
            'subscription.endDate': endDate
        });

        return NextResponse.json({ success: true, endDate });
    } catch (error: any) {
        console.error("[FreeUpgradeAPI] Erreur:", error);
        return NextResponse.json({ error: "Erreur serveur lors de l'activation du plan gratuit." }, { status: 500 });
    }
}
