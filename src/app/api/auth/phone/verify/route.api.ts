import { NextRequest, NextResponse } from 'next/server';
import { withCors, corsPreflight } from '@/lib/api-cors';
import { verifyCode } from '@/lib/otp';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * Seconde étape : vérification du code, puis émission d'un jeton personnalisé.
 *
 * Le client échange ce jeton contre une session via `signInWithCustomToken`. À partir de
 * là il s'agit d'une session Firebase ordinaire : `useUser`, `AuthGuard` et les règles
 * Firestore fonctionnent sans modification.
 */
async function POSTHandler(req: NextRequest) {
  try {
    const { phone, code, displayName } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Numéro et code requis.' }, { status: 400 });
    }

    const outcome = await verifyCode(String(phone), String(code));

    if (!outcome.ok) {
      // Messages distincts uniquement quand ils aident l'utilisateur légitime sans
      // renseigner un attaquant : « expiré » et « trop de tentatives » n'apprennent rien
      // sur la validité du numéro.
      const messages: Record<string, string> = {
        invalid_phone: "Ce numéro n'est pas valide.",
        not_found: 'Aucun code en attente pour ce numéro. Demandez-en un nouveau.',
        expired: 'Ce code a expiré. Demandez-en un nouveau.',
        too_many_attempts: 'Trop de tentatives. Demandez un nouveau code.',
        mismatch: 'Code incorrect.',
      };
      return NextResponse.json({ error: messages[outcome.reason] }, { status: 401 });
    }

    const auth = getAdminAuth();
    const verifiedPhone = outcome.phone;

    // Récupération ou création du compte. Firebase garantit l'unicité du numéro, ce qui
    // évite les doublons même en cas de requêtes concurrentes.
    let uid: string;
    let isNewAccount = false;
    try {
      const existing = await auth.getUserByPhoneNumber(verifiedPhone);
      uid = existing.uid;
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') throw error;
      const created = await auth.createUser({
        phoneNumber: verifiedPhone,
        displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : undefined,
      });
      uid = created.uid;
      isNewAccount = true;
    }

    // Document utilisateur créé côté serveur. L'Admin SDK contourne les règles, ce qui est
    // ici nécessaire : `firestore.rules` interdit au client de créer ce document avec des
    // champs à privilèges (voir usersNoSelfEscalation).
    if (isNewAccount) {
      await getAdminDb()
        .collection('users')
        .doc(uid)
        .set(
          {
            uid,
            phone: verifiedPhone,
            displayName: typeof displayName === 'string' ? displayName.trim() : '',
            createdAt: FieldValue.serverTimestamp(),
            signUpMethod: 'phone',
            isSuperAdmin: false,
          },
          { merge: true },
        );
    }

    const token = await auth.createCustomToken(uid);

    return NextResponse.json({ token, isNewAccount });
  } catch (error: any) {
    console.error('[AuthPhoneVerify] Erreur :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export const POST = withCors(POSTHandler);
