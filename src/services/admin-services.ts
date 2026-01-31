'use client';
import { Firestore, doc, writeBatch, getDoc } from 'firebase/firestore';
import type { user_root } from '@/lib/data-types';

export async function revokeSuperAdmin(firestore: Firestore, userIdToRevoke: string, revokingAdminId: string): Promise<void> {
    if (!userIdToRevoke || !revokingAdminId) {
        throw new Error("Les ID utilisateur sont requis.");
    }
    if (userIdToRevoke === revokingAdminId) {
        throw new Error("Vous ne pouvez pas révoquer vos propres privilèges.");
    }

    const batch = writeBatch(firestore);
    const userRootRef = doc(firestore, 'users', userIdToRevoke);

    // 1. Set isSuperAdmin to false in user's root doc
    batch.update(userRootRef, { isSuperAdmin: false });

    // 2. Find all schools the user belongs to and set isAdmin to false
    const userRootSnap = await getDoc(userRootRef);
    if (userRootSnap.exists()) {
        const userData = userRootSnap.data() as user_root;
        const schoolIds = Object.keys(userData.schools || {});
        for (const schoolId of schoolIds) {
            const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel/${userIdToRevoke}`);
            // Also update the isAdmin flag in the staff profile for consistency
            batch.update(staffProfileRef, { isAdmin: false });
        }
    }
    
    try {
        await batch.commit();
    } catch(e) {
        console.error("Error committing revokeSuperAdmin batch:", e);
        throw new Error("Une erreur de base de données est survenue lors de la révocation.");
    }
}
