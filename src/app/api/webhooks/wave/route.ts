
import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc, writeBatch, collection } from 'firebase-admin/firestore';
import { initializeApp, getApps, App as AdminApp } from 'firebase-admin/app';
import { addMonths } from 'date-fns';
import type { school, student } from '@/lib/data-types';

async function handleSubscriptionPayment(db: any, schoolId: string, durationStr: string) {
    const durationMonths = parseInt(durationStr.replace('m', ''), 10) || 1;
    console.log(`Processing Wave subscription for schoolId: ${schoolId}, duration: ${durationMonths} months.`);

    const schoolRef = doc(db, 'ecoles', schoolId);
    const schoolSnap = await getDoc(schoolRef);

    if (!schoolSnap.exists()) {
        console.error(`School with ID ${schoolId} not found.`);
        throw new Error('School not found');
    }

    const schoolData = schoolSnap.data() as school;
    const currentEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = currentEndDate < new Date() ? new Date() : currentEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    await updateDoc(schoolRef, {
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'subscription.updatedAt': serverTimestamp(),
    });
    console.log(`Successfully updated Wave subscription for school ${schoolId}.`);
}


async function handleTuitionPayment(db: any, schoolId: string, studentId: string, amountStr: string) {
    const amountPaid = parseInt(amountStr, 10);
    console.log(`Processing Wave tuition payment for schoolId: ${schoolId}, studentId: ${studentId}, amount: ${amountPaid}`);

    const studentRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}`);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        console.error(`Student with ID ${studentId} in school ${schoolId} not found.`);
        throw new Error('Student not found');
    }
    
    const studentData = studentSnap.data() as student;
    const newAmountDue = Math.max(0, (studentData.amountDue || 0) - amountPaid);
    const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';
    
    const batch = writeBatch(db);
    
    batch.update(studentRef, { amountDue: newAmountDue, tuitionStatus: newStatus });

    const accountingRef = doc(collection(db, `ecoles/${schoolId}/comptabilite`));
    batch.set(accountingRef, {
        schoolId, studentId, date: new Date().toISOString().split('T')[0],
        description: `Paiement scolarité via Wave`, category: 'Scolarité', type: 'Revenu', amount: amountPaid
    });

    const paymentRef = doc(collection(db, `ecoles/${schoolId}/eleves/${studentId}/paiements`));
    batch.set(paymentRef, {
        schoolId, studentId, date: new Date().toISOString().split('T')[0], amount: amountPaid,
        description: 'Paiement en ligne via Wave', accountingTransactionId: accountingRef.id,
        payerFirstName: studentData.parent1FirstName || 'Parent', payerLastName: studentData.parent1LastName || '',
        method: 'Paiement Mobile'
    });
    
    await batch.commit();
    console.log(`Successfully updated tuition for student ${studentId}.`);
}


export async function POST(request: Request) {
  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    const db = getFirestore();
    const body = await request.json();
    console.log("Received Wave Webhook:", body);

    const { type, data } = body;

    if (type !== 'checkout.session.completed' || data?.status !== 'complete') {
        console.log(`Wave event type is "${type}" with status "${data?.status}". Ignoring.`);
        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    const clientReference = data?.client_reference;
    if (!clientReference) {
        console.error("Wave Webhook: Missing client_reference in payload.");
        return NextResponse.json({ error: "Missing client_reference" }, { status: 400 });
    }

    const parts = clientReference.split('_');
    const paymentType = parts[0];

    if (paymentType === 'tuition' && parts.length >= 4) {
        const schoolId = parts[1];
        const studentId = parts[2];
        const amountStr = parts[3];
        await handleTuitionPayment(db, schoolId, studentId, amountStr);
    } else if (paymentType === 'subscription' && parts.length >= 4) {
        const schoolId = parts[1];
        const durationStr = parts[3]; // E.g. '12m'
        await handleSubscriptionPayment(db, schoolId, durationStr);
    } else {
        console.warn(`Invalid client_reference format: ${clientReference}. Could not determine payment type.`);
    }

    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Error processing Wave webhook:", error);
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
