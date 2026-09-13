'use client';

import { collection, doc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { audit_log } from '@/lib/data-types';

export interface WriteAuditLogParams {
    action: string;
    details: string;
    userId: string;
    userName?: string;
    userRole?: string;
    targetId?: string;
    targetType?: string;
    payload?: any;
}

/**
 * Écrit une entrée dans le journal d'audit de l'école (`ecoles/{schoolId}/audit_logs`,
 * lu par `/dashboard/parametres/audit`). À utiliser pour toute action sensible
 * (permissions, rôles, comptes) afin qu'elle soit traçable — qui, quoi, quand.
 */
export async function writeAuditLog(firestore: Firestore, schoolId: string, params: WriteAuditLogParams): Promise<void> {
    const logRef = doc(collection(firestore, `ecoles/${schoolId}/audit_logs`));
    const logData: audit_log = {
        action: params.action,
        details: params.details,
        userId: params.userId,
        ...(params.userName ? { userName: params.userName } : {}),
        ...(params.userRole ? { userRole: params.userRole } : {}),
        ...(params.targetId ? { targetId: params.targetId } : {}),
        ...(params.targetType ? { targetType: params.targetType } : {}),
        ...(params.payload !== undefined ? { payload: params.payload } : {}),
        timestamp: serverTimestamp(),
    };
    await setDoc(logRef, logData as any);
}
