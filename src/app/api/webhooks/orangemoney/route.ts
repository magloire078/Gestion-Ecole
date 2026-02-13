
import { NextResponse } from 'next/server';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { addMonths } from 'date-fns';
import type { school, student } from '@/lib/data-types';

async function handleSubscriptionPayment(db: Firestore, schoolId: string, durationStr: string, paymentProvider: string) {
    const durationMonths = parseInt(durationStr.replace('m', ''), 10) || 1;
    console.log(`Processing ${paymentProvider} subscription for schoolId: ${schoolId}, duration: ${durationMonths} months.`);

    const schoolRef = db.collection('ecoles').doc(schoolId);
    const schoolSnap = await schoolRef.get();

    if (!schoolSnap.exists) {
        console.error(`[${paymentProvider}] School with ID ${schoolId} not found.`);
        throw new Error('School not found');
    }

    const schoolData = schoolSnap.data() as school;
    const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = subEndDate < new Date() ? new Date() : subEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    await schoolRef.update({
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'updatedAt': FieldValue.serverTimestamp(),
    });
    console.log(`[${paymentProvider}] Successfully updated subscription for school ${schoolId}.`);
}


async function handleTuitionPayment(db: Firestore, schoolId: string, studentId: string, amountPaid: number, paymentProvider: string) {
    console.log(`Processing ${paymentProvider} tuition payment for schoolId: ${schoolId}, studentId: ${studentId}, amount: ${amountPaid}`);

    const studentRef = db.doc(`ecoles/${schoolId}/eleves/${studentId}`);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
        console.error(`[${paymentProvider}] Student with ID ${studentId} in school ${schoolId} not found.`);
        throw new Error('Student not found');
    }

    const studentData = studentSnap.data() as student;
    const newAmountDue = Math.max(0, (studentData.amountDue || 0) - amountPaid);
    const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';

    const batch = db.batch();

    batch.update(studentRef, { amountDue: newAmountDue, tuitionStatus: newStatus });

    const accountingRef = db.collection(`ecoles/${schoolId}/comptabilite`).doc();
    batch.set(accountingRef, {
        schoolId, studentId, date: new Date().toISOString().split('T')[0],
        description: `Paiement scolarité via ${paymentProvider}`, category: 'Scolarité', type: 'Revenu', amount: amountPaid
    });

    const paymentRef = db.collection(`ecoles/${schoolId}/eleves/${studentId}/paiements`).doc();
    batch.set(paymentRef, {
        schoolId, studentId, date: new Date().toISOString().split('T')[0], amount: amountPaid,
        description: `Paiement en ligne via ${paymentProvider}`, accountingTransactionId: accountingRef.id,
        payerFirstName: studentData.parent1FirstName || 'Parent', payerLastName: studentData.parent1LastName || '',
        method: paymentProvider === 'Stripe' ? 'Carte Bancaire' : 'Paiement Mobile'
    });

    await batch.commit();
    console.log(`[${paymentProvider}] Successfully updated tuition for student ${studentId}.`);
}

export async function POST(request: Request) {
    try {
        if (getApps().length === 0) {
            initializeApp();
        }
        const db = getFirestore();
        const body = await request.json();
        console.log("Received Orange Money IPN:", JSON.stringify(body, null, 2));

        const { status, order_id, amount } = body;
        if (!status || !order_id || !amount) {
            console.error("Orange Money IPN: Missing required fields.");
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        if (status !== 'SUCCESS') {
            console.log(`Payment status is ${status}. Ignoring.`);
            return NextResponse.json({}, { status: 200 });
        }

        const parts = order_id.split('_');
        const paymentType = parts[0];

        if (paymentType === 'tuition' && parts.length >= 4) {
            const schoolId = parts[1];
            const studentId = parts[2];
            await handleTuitionPayment(db, schoolId, studentId, parseInt(amount, 10), 'Orange Money');
        } else if (paymentType === 'subscription' && parts.length >= 4) {
            const schoolId = parts[1];
            const durationStr = parts[3];
            await handleSubscriptionPayment(db, schoolId, durationStr, 'Orange Money');
        } else {
            console.warn(`Invalid order_id format: ${order_id}. Could not determine payment type.`);
        }

        return NextResponse.json({}, { status: 200 });

    } catch (error: any) {
        console.error("Error processing Orange Money IPN:", error);
        if (error.message.includes("The default Firebase app does not exist")) {
            return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
        }
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
