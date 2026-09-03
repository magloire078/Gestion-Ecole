import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';

export type AdminAuthError = { error: string; status: number };
export type AdminAuthSuccess = { uid: string; email: string | null; isSuperAdmin: boolean; isCommercial: boolean };

/**
 * Vérifie le token Bearer et charge les flags de privilège sur le document
 * racine users/{uid} : isSuperAdmin (booléen top-level, celui que les règles
 * Firestore et grantSuperAdmin() maintiennent réellement) et commercialAccess
 * (accès restreint au pipeline prospects, cf. grantCommercialAccess()).
 *
 * Ne PAS lire `profile.isAdmin` ici : ce champ n'existe que sur les fiches
 * personnel par école (ecoles/{schoolId}/personnel/{uid}), jamais sur le
 * document racine — le lire depuis l'Admin SDK renvoie toujours undefined,
 * ce qui rendait ces routes inaccessibles à tout le monde, y compris aux
 * super-admins.
 */
async function verifyCaller(request: NextRequest): Promise<AdminAuthSuccess | AdminAuthError> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Missing Authorization header', status: 401 };
    }
    let decoded;
    try {
        decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    } catch (err) {
        console.error('[admin-auth] verifyIdToken failed', err);
        return { error: 'Invalid token', status: 401 };
    }
    const snap = await getAdminDb().collection('users').doc(decoded.uid).get();
    const data = snap.data();
    return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        isSuperAdmin: data?.isSuperAdmin === true,
        isCommercial: data?.commercialAccess === true,
    };
}

/** Réservé aux super-admins de la plateforme (accès complet). */
export async function requireSuperAdmin(request: NextRequest): Promise<{ uid: string; email: string | null } | AdminAuthError> {
    const result = await verifyCaller(request);
    if ('error' in result) return result;
    if (!result.isSuperAdmin) return { error: 'Admin access required', status: 403 };
    return { uid: result.uid, email: result.email };
}

/**
 * Super-admin OU compte commercial (accès restreint, réservé aux routes du
 * pipeline prospects). Le champ isSuperAdmin est renvoyé pour que la route
 * puisse, si besoin, autoriser une action supplémentaire aux super-admins
 * uniquement au sein d'un même endpoint partagé.
 */
export async function requireSuperAdminOrCommercial(request: NextRequest): Promise<{ uid: string; email: string | null; isSuperAdmin: boolean } | AdminAuthError> {
    const result = await verifyCaller(request);
    if ('error' in result) return result;
    if (!result.isSuperAdmin && !result.isCommercial) return { error: 'Admin access required', status: 403 };
    return { uid: result.uid, email: result.email, isSuperAdmin: result.isSuperAdmin };
}
