
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { addMonths } from 'date-fns';
import type { school as School, student as Student } from './data-types';

export interface ProviderReference {
    provider: string;
    sessionId?: string;
    paymentIntentId?: string;
    refundId?: string;
}

function asProviderRef(input: string | ProviderReference): ProviderReference {
    return typeof input === 'string' ? { provider: input } : input;
}

/**
 * Updates a school's subscription after a successful payment and sends confirmation.
 */
export async function processSubscriptionPayment(
    schoolId: string,
    planName: string,
    durationMonths: number,
    paymentProvider: string | ProviderReference
) {
    const ref = asProviderRef(paymentProvider);
    console.log(`[PaymentProcessing] Updating subscription for school: ${schoolId}, plan: ${planName}, duration: ${durationMonths} months`);

    const schoolRef = getAdminDb().collection('ecoles').doc(schoolId);
    const schoolSnap = await schoolRef.get();

    if (!schoolSnap.exists) {
        console.error(`[PaymentProcessing] School ${schoolId} not found.`);
        throw new Error('School not found');
    }

    const schoolData = schoolSnap.data() as School;
    const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = subEndDate < new Date() ? new Date() : subEndDate;
    const newEndDate = addMonths(startDate, durationMonths);
    const endDateStr = newEndDate.toISOString();

    await schoolRef.update({
        'subscription.plan': planName,
        'subscription.status': 'active',
        'subscription.endDate': endDateStr,
        'subscription.lastPayment': {
            provider: ref.provider,
            sessionId: ref.sessionId || null,
            paymentIntentId: ref.paymentIntentId || null,
            paidAt: new Date().toISOString(),
        },
        'updatedAt': FieldValue.serverTimestamp(),
    });

    // Send confirmation email to director
    if (schoolData.directorEmail) {
        try {
            await getAdminDb().collection('mail').add({
                to: schoolData.directorEmail,
                message: {
                    subject: `Confirmation d'abonnement - ${planName} - ${schoolData.name}`,
                    html: `
                        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #0C365A; padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0;">GéreEcole</h1>
                            </div>
                            <div style="padding: 20px; border: 1px solid #eee;">
                                <h2 style="color: #0C365A;">Abonnement Activé ✅</h2>
                                <p>Félicitations ! Votre abonnement au plan <strong>${planName}</strong> pour l'établissement <strong>${schoolData.name}</strong> a été activé avec succès.</p>
                                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p style="margin: 5px 0;"><strong>Plan :</strong> ${planName}</p>
                                    <p style="margin: 5px 0;"><strong>Échéance :</strong> ${new Date(endDateStr).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <p>Vous avez maintenant accès à toutes les fonctionnalités de votre nouveau plan.</p>
                                <div style="margin: 30px 0; text-align: center;">
                                    <a href="https://gereecole.com/dashboard" style="background-color: #2D9CDB; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accéder au Dashboard</a>
                                </div>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 0.8em; color: #777; text-align: center;">L'équipe GéreEcole</p>
                            </div>
                        </div>
                    `
                },
                delivery: {
                    startTime: FieldValue.serverTimestamp(),
                    state: 'PENDING'
                }
            });
        } catch (mailError) {
            console.error(`[PaymentProcessing] Error sending subscription email:`, mailError);
        }
    }

    console.log(`[PaymentProcessing] Successfully updated subscription for school ${schoolId}.`);
    return { success: true, newEndDate: endDateStr };
}

/**
 * Updates a student's tuition balance and sends receipt to parents.
 */
export async function processTuitionPayment(
    schoolId: string,
    studentId: string,
    amountPaid: number,
    paymentProvider: string | ProviderReference
) {
    const ref = asProviderRef(paymentProvider);
    console.log(`[PaymentProcessing] Updating tuition for student: ${studentId} in school: ${schoolId}, amount: ${amountPaid}`);

    const studentRef = getAdminDb().doc(`ecoles/${schoolId}/eleves/${studentId}`);
    const schoolSnap = await getAdminDb().collection('ecoles').doc(schoolId).get();
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists || !schoolSnap.exists) {
        console.error(`[PaymentProcessing] Student or School not found.`);
        throw new Error('Required documents not found');
    }

    const studentData = studentSnap.data() as Student;
    const schoolData = schoolSnap.data() as School;
    const newAmountDue = Math.max(0, (studentData.amountDue || 0) - amountPaid);
    const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';

    const batch = getAdminDb().batch();
    const reference = `PAY-${Date.now().toString().slice(-6)}`;

    // 1. Update Student Balance
    batch.update(studentRef, {
        amountDue: newAmountDue,
        tuitionStatus: newStatus,
        updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Create Accounting Record
    const accountingRef = getAdminDb().collection(`ecoles/${schoolId}/comptabilite`).doc();
    batch.set(accountingRef, {
        schoolId,
        studentId,
        date: new Date().toISOString().split('T')[0],
        description: `Paiement scolarité via ${ref.provider}`,
        category: 'Scolarité',
        type: 'Revenu',
        amount: amountPaid,
        reference: reference,
        provider: ref.provider,
        providerSessionId: ref.sessionId || null,
        providerPaymentIntentId: ref.paymentIntentId || null,
        createdAt: FieldValue.serverTimestamp()
    });

    // 3. Create Student Payment Record
    const paymentRef = getAdminDb().collection(`ecoles/${schoolId}/eleves/${studentId}/paiements`).doc();
    batch.set(paymentRef, {
        schoolId,
        studentId,
        date: new Date().toISOString().split('T')[0],
        amount: amountPaid,
        description: `Paiement en ligne via ${ref.provider}`,
        accountingTransactionId: accountingRef.id,
        payerFirstName: studentData.parent1FirstName || 'Parent',
        payerLastName: studentData.parent1LastName || '',
        method: ref.provider === 'Stripe' ? 'Carte Bancaire' : 'Paiement Mobile',
        reference: reference,
        provider: ref.provider,
        providerSessionId: ref.sessionId || null,
        providerPaymentIntentId: ref.paymentIntentId || null,
        createdAt: FieldValue.serverTimestamp()
    });

    // 4. Update Global Financial Stats
    const statsRef = getAdminDb().doc(`ecoles/${schoolId}/stats/finance`);
    batch.set(statsRef, {
        totalAmountDue: FieldValue.increment(-amountPaid),
        lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();

    // 5. Send Receipt to Parents
    const parentIds = studentData.parentIds || [];
    const studentName = `${studentData.firstName} ${studentData.lastName}`;
    const parentName = studentData.parent1FirstName || 'Parent';

    for (const parentId of parentIds) {
        try {
            const parentSnap = await getAdminDb().doc(`ecoles/${schoolId}/parents/${parentId}`).get();
            if (parentSnap.exists) {
                const parentData = parentSnap.data();
                if (parentData?.email) {
                    await getAdminDb().collection('mail').add({
                        to: parentData.email,
                        message: {
                            subject: `Reçu de paiement - ${studentName}`,
                            html: `
                                <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                                    <div style="background-color: #22c55e; padding: 20px; text-align: center;">
                                        <h1 style="color: white; margin: 0;">Confirmation de Paiement</h1>
                                    </div>
                                    <div style="padding: 20px; border: 1px solid #eee;">
                                        <p>Bonjour ${parentName},</p>
                                        <p>Nous confirmons la réception de votre paiement concernant les frais de scolarité de <strong>${studentName}</strong>.</p>
                                        <div style="border: 1px solid #eee; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                            <p style="margin: 5px 0;"><strong>Référence :</strong> ${reference}</p>
                                            <p style="margin: 5px 0;"><strong>Montant :</strong> ${amountPaid.toLocaleString()} CFA</p>
                                            <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                                            <p style="margin: 5px 0;"><strong>Établissement :</strong> ${schoolData.name}</p>
                                        </div>
                                        <p>Merci de votre confiance.</p>
                                        <div style="margin: 30px 0; text-align: center;">
                                            <a href="https://gereecole.com/dashboard/comptabilite" style="background-color: #0C365A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Voir mon historique</a>
                                        </div>
                                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                                        <p style="font-size: 0.8em; color: #777; text-align: center;">Service Comptabilité - GéreEcole</p>
                                    </div>
                                </div>
                            `
                        },
                        delivery: {
                            startTime: FieldValue.serverTimestamp(),
                            state: 'PENDING'
                        }
                    });
                }
            }
        } catch (mailError) {
            console.error(`[PaymentProcessing] Error sending tuition receipt:`, mailError);
        }
    }

    console.log(`[PaymentProcessing] Successfully updated tuition for student ${studentId}.`);
    return { success: true, newAmountDue };
}

/**
 * Reverses a tuition payment after a refund. Restores the amount due, writes a
 * negative accounting entry, and marks the original payment as refunded.
 */
export async function reverseTuitionPayment(
    schoolId: string,
    studentId: string,
    amountRefunded: number,
    ref: ProviderReference
) {
    console.log(`[PaymentProcessing] Reversing tuition payment: student=${studentId} amount=${amountRefunded}`);

    const studentRef = getAdminDb().doc(`ecoles/${schoolId}/eleves/${studentId}`);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) throw new Error('Student not found');

    const studentData = studentSnap.data() as Student;
    const newAmountDue = (studentData.amountDue || 0) + amountRefunded;
    const newStatus = newAmountDue > 0 ? 'Partiel' : 'Soldé';

    const batch = getAdminDb().batch();
    const refundRef = `REF-${Date.now().toString().slice(-6)}`;

    batch.update(studentRef, {
        amountDue: newAmountDue,
        tuitionStatus: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
    });

    const accountingRef = getAdminDb().collection(`ecoles/${schoolId}/comptabilite`).doc();
    batch.set(accountingRef, {
        schoolId,
        studentId,
        date: new Date().toISOString().split('T')[0],
        description: `Remboursement scolarité via ${ref.provider}`,
        category: 'Remboursement',
        type: 'Dépense',
        amount: amountRefunded,
        reference: refundRef,
        provider: ref.provider,
        providerSessionId: ref.sessionId || null,
        providerPaymentIntentId: ref.paymentIntentId || null,
        providerRefundId: ref.refundId || null,
        createdAt: FieldValue.serverTimestamp(),
    });

    // Link back to the original payment record if we can find it.
    if (ref.paymentIntentId) {
        const paymentsSnap = await getAdminDb()
            .collection(`ecoles/${schoolId}/eleves/${studentId}/paiements`)
            .where('providerPaymentIntentId', '==', ref.paymentIntentId)
            .limit(1)
            .get();
        if (!paymentsSnap.empty) {
            batch.update(paymentsSnap.docs[0].ref, {
                refunded: true,
                refundedAmount: amountRefunded,
                refundedAt: FieldValue.serverTimestamp(),
                refundId: ref.refundId || null,
            });
        }
    }

    const statsRef = getAdminDb().doc(`ecoles/${schoolId}/stats/finance`);
    batch.set(
        statsRef,
        {
            totalAmountDue: FieldValue.increment(amountRefunded),
            lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    await batch.commit();
    console.log(`[PaymentProcessing] Refund recorded for student ${studentId}.`);
    return { success: true, newAmountDue };
}

/**
 * Logs a failed payment attempt to Firestore so admins can review via the
 * dashboard. Non-blocking: swallows its own errors.
 */
export async function logPaymentFailure(
    schoolId: string,
    failure: {
        provider: string;
        paymentIntentId?: string;
        sessionId?: string;
        type: 'tuition' | 'subscription';
        studentId?: string;
        amount?: number;
        currency?: string;
        errorCode?: string | null;
        errorMessage?: string | null;
    }
) {
    try {
        await getAdminDb()
            .collection(`ecoles/${schoolId}/paymentErrors`)
            .add({
                ...failure,
                createdAt: FieldValue.serverTimestamp(),
            });
    } catch (err) {
        console.error('[PaymentProcessing] Failed to log payment failure:', err);
    }
}
