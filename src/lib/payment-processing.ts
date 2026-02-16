
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { addMonths } from 'date-fns';
import type { school as School, student as Student } from './data-types';

/**
 * Updates a school's subscription after a successful payment.
 */
export async function processSubscriptionPayment(
    schoolId: string,
    planName: string,
    durationMonths: number,
    paymentProvider: string
) {
    console.log(`[PaymentProcessing] Updating subscription for school: ${schoolId}, plan: ${planName}, duration: ${durationMonths} months`);

    const schoolRef = adminDb.collection('ecoles').doc(schoolId);
    const schoolSnap = await schoolRef.get();

    if (!schoolSnap.exists) {
        console.error(`[PaymentProcessing] School ${schoolId} not found.`);
        throw new Error('School not found');
    }

    const schoolData = schoolSnap.data() as School;
    const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = subEndDate < new Date() ? new Date() : subEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    await schoolRef.update({
        'subscription.plan': planName,
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'updatedAt': FieldValue.serverTimestamp(),
    });

    console.log(`[PaymentProcessing] Successfully updated subscription for school ${schoolId}.`);
    return { success: true, newEndDate: newEndDate.toISOString() };
}

/**
 * Updates a student's tuition balance and creates accounting records after a successful payment.
 */
export async function processTuitionPayment(
    schoolId: string,
    studentId: string,
    amountPaid: number,
    paymentProvider: string
) {
    console.log(`[PaymentProcessing] Updating tuition for student: ${studentId} in school: ${schoolId}, amount: ${amountPaid}`);

    const studentRef = adminDb.doc(`ecoles/${schoolId}/eleves/${studentId}`);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
        console.error(`[PaymentProcessing] Student ${studentId} in school ${schoolId} not found.`);
        throw new Error('Student not found');
    }

    const studentData = studentSnap.data() as Student;
    const newAmountDue = Math.max(0, (studentData.amountDue || 0) - amountPaid);
    const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';

    const batch = adminDb.batch();

    // 1. Update Student Balance
    batch.update(studentRef, {
        amountDue: newAmountDue,
        tuitionStatus: newStatus,
        updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Create Accounting Record
    const accountingRef = adminDb.collection(`ecoles/${schoolId}/comptabilite`).doc();
    batch.set(accountingRef, {
        schoolId,
        studentId,
        date: new Date().toISOString().split('T')[0],
        description: `Paiement scolarité via ${paymentProvider}`,
        category: 'Scolarité',
        type: 'Revenu',
        amount: amountPaid,
        createdAt: FieldValue.serverTimestamp()
    });

    // 3. Create Student Payment Record
    const paymentRef = adminDb.collection(`ecoles/${schoolId}/eleves/${studentId}/paiements`).doc();
    batch.set(paymentRef, {
        schoolId,
        studentId,
        date: new Date().toISOString().split('T')[0],
        amount: amountPaid,
        description: `Paiement en ligne via ${paymentProvider}`,
        accountingTransactionId: accountingRef.id,
        payerFirstName: studentData.parent1FirstName || 'Parent',
        payerLastName: studentData.parent1LastName || '',
        method: paymentProvider === 'Stripe' ? 'Carte Bancaire' : 'Paiement Mobile',
        createdAt: FieldValue.serverTimestamp()
    });

    // 4. Update Global Financial Stats
    const statsRef = adminDb.doc(`ecoles/${schoolId}/stats/finance`);
    batch.set(statsRef, {
        totalAmountDue: FieldValue.increment(-amountPaid),
        lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();
    console.log(`[PaymentProcessing] Successfully updated tuition for student ${studentId}.`);
    return { success: true, newAmountDue };
}
