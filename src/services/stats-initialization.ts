import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';

/**
 * Initializes the aggregated finance stats for a specific school
 * by scanning all students and calculating totals.
 */
export async function initializeFinanceStats(schoolId: string) {
    if (!schoolId) throw new Error("ID de l'école requis.");

    const studentsRef = collection(db, `ecoles/${schoolId}/eleves`);
    const snapshot = await getDocs(studentsRef);

    let totalTuitionFees = 0;
    let totalAmountDue = 0;
    let studentCount = 0;

    snapshot.forEach(doc => {
        const student = doc.data();
        // Only count active/waiting students for the dashboard overview if needed, 
        // or all students if that's the current behavior.
        // The current component calculates for all students in the collection.
        totalTuitionFees += Number(student.tuitionFee || 0);
        totalAmountDue += Number(student.amountDue || 0);
        studentCount += 1;
    });

    const statsRef = doc(db, `ecoles/${schoolId}/stats/finance`);

    await writeBatch(db)
        .set(statsRef, {
            totalTuitionFees,
            totalAmountDue,
            studentCount,
            lastUpdated: serverTimestamp()
        }, { merge: true })
        .commit();

    return { totalTuitionFees, totalAmountDue, studentCount };
}
