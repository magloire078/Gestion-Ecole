
'use server';

import { getFirestore, doc, updateDoc, serverTimestamp, getDoc, writeBatch, collection, type Firestore } from 'firebase-admin/firestore';
import { addMonths } from 'date-fns';
import type { school, student } from '@/lib/data-types';

/**
 * Handles the logic for updating a school's subscription after a successful payment.
 * @param db - The Firestore admin instance.
 * @param schoolId - The ID of the school to update.
 * @param durationStr - The duration of the subscription (e.g., '1m', '12m').
 * @param paymentProvider - The name of the payment provider for logging.
 */
export async function handleSubscriptionPayment(db: Firestore, schoolId: string, durationStr: string, paymentProvider: string) {
    const durationMonths = parseInt(durationStr.replace('m', ''), 10) || 1;
    console.log(`Processing ${paymentProvider} subscription for schoolId: ${schoolId}, duration: ${durationMonths} months.`);

    const schoolRef = doc(db, 'ecoles', schoolId);
    const schoolSnap = await getDoc(schoolRef);

    if (!schoolSnap.exists()) {
        console.error(`[${paymentProvider}] School with ID ${schoolId} not found.`);
        throw new Error('School not found');
    }

    const schoolData = schoolSnap.data() as school;
    const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = subEndDate < new Date() ? new Date() : subEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    await updateDoc(schoolRef, {
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'updatedAt': serverTimestamp(),
    });
    console.log(`[${paymentProvider}] Successfully updated subscription for school ${schoolId}.`);
}

/**
 * Handles the logic for updating a student's tuition after a successful payment.
 * @param db - The Firestore admin instance.
 * @param schoolId - The ID of the school.
 * @param studentId - The ID of the student.
 * @param amountPaid - The amount paid by the user.
 * @param paymentProvider - The name of the payment provider for logging.
 */
export async function handleTuitionPayment(db: Firestore, schoolId: string, studentId: string, amountPaid: number, paymentProvider: string) {
    console.log(`Processing ${paymentProvider} tuition payment for schoolId: ${schoolId}, studentId: ${studentId}, amount: ${amountPaid}`);

    const studentRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}`);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        console.error(`[${paymentProvider}] Student with ID ${studentId} in school ${schoolId} not found.`);
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
        description: `Paiement scolarité via ${paymentProvider}`, category: 'Scolarité', type: 'Revenu', amount: amountPaid
    });

    const paymentRef = doc(collection(db, `ecoles/${schoolId}/eleves/${studentId}/paiements`));
    batch.set(paymentRef, {
        schoolId, studentId, date: new Date().toISOString().split('T')[0], amount: amountPaid,
        description: `Paiement en ligne via ${paymentProvider}`, accountingTransactionId: accountingRef.id,
        payerFirstName: studentData.parent1FirstName || 'Parent', payerLastName: studentData.parent1LastName || '',
        method: paymentProvider === 'Stripe' ? 'Carte Bancaire' : 'Paiement Mobile'
    });
    
    await batch.commit();
    console.log(`[${paymentProvider}] Successfully updated tuition for student ${studentId}.`);
}
