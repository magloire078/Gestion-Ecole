import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Point d'envoi d'email unique pour les clients.
 *
 * La collection `mail` (consommée par l'extension "Trigger Email") n'est plus
 * inscriptible directement depuis le navigateur (firestore.rules : create =
 * false). Tout passe désormais par cette route, qui authentifie l'appelant via
 * son jeton d'ID Firebase et estampille l'auteur (createdBy). Cela crée un point
 * de contrôle unique — traçable et propice à un futur rate-limiting — au lieu
 * d'un accès en écriture ouvert à tout compte authentifié.
 *
 * Les envois côté serveur (webhooks, paiements) continuent d'écrire dans `mail`
 * via l'Admin SDK, qui contourne les règles.
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
        if (!tokenMatch) {
            return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
        }

        let decoded;
        try {
            decoded = await getAdminAuth().verifyIdToken(tokenMatch[1]);
        } catch {
            return NextResponse.json({ error: 'Session invalide, veuillez vous reconnecter.' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { to, message, schoolId, template } = body || {};

        const recipients = Array.isArray(to) ? to : (typeof to === 'string' ? [to] : []);
        const recipientsValid = recipients.length > 0
            && recipients.every((r: unknown) => typeof r === 'string' && EMAIL_RE.test(r));
        if (!recipientsValid) {
            return NextResponse.json({ error: 'Destinataire invalide.' }, { status: 400 });
        }

        if (!message || typeof message.subject !== 'string' || typeof message.html !== 'string') {
            return NextResponse.json({ error: 'Message invalide.' }, { status: 400 });
        }

        const db = getAdminDb();
        await db.collection('mail').add({
            to: recipients,
            message: {
                subject: message.subject,
                html: message.html,
                ...(typeof message.text === 'string' ? { text: message.text } : {}),
            },
            ...(typeof schoolId === 'string' && schoolId ? { schoolId } : {}),
            ...(template ? { template } : {}),
            // Traçabilité serveur : qui a déclenché l'envoi et quand.
            createdBy: decoded.uid,
            createdAt: FieldValue.serverTimestamp(),
            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[MailSendAPI] Erreur:', error);
        return NextResponse.json({ error: "Échec de l'envoi de l'email." }, { status: 500 });
    }
}
