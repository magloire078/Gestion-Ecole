import { NextRequest, NextResponse } from 'next/server';
import { withCors, corsPreflight } from '@/lib/api-cors';
import { startVerification } from '@/lib/otp';
import { deliverCode } from '@/lib/otp-delivery';

export const dynamic = 'force-dynamic';

/**
 * Première étape de la création de compte par téléphone : envoi du code.
 *
 * La réponse est volontairement **neutre**. Elle n'indique jamais si le numéro correspond
 * déjà à un compte : le contraire transformerait cette route en annuaire permettant de
 * tester l'existence de n'importe quel numéro. Un même message de succès est renvoyé que
 * le compte existe ou non — la distinction se fera à la vérification, de façon invisible
 * pour l'appelant.
 */
async function POSTHandler(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis.' }, { status: 400 });
    }

    const outcome = await startVerification(phone);

    if (!outcome.ok) {
      if (outcome.reason === 'invalid_phone') {
        return NextResponse.json(
          { error: "Ce numéro n'est pas valide. Vérifiez-le et réessayez." },
          { status: 400 },
        );
      }
      // Trop d'envois : on renvoie 429 avec le délai, sans autre détail.
      return NextResponse.json(
        {
          error:
            outcome.reason === 'cooldown'
              ? 'Un code vient déjà de vous être envoyé. Patientez un instant.'
              : 'Trop de demandes pour ce numéro. Réessayez plus tard.',
          retryAfterSeconds: outcome.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    const channel = await deliverCode(outcome.phone, outcome.code);

    if (channel === 'none') {
      // Aucun canal n'a fonctionné : inutile de laisser l'utilisateur attendre un code
      // qui n'arrivera pas.
      console.error('[AuthPhoneStart] Aucun canal disponible pour acheminer le code.');
      return NextResponse.json(
        { error: "Impossible d'envoyer le code pour le moment. Réessayez plus tard." },
        { status: 502 },
      );
    }

    console.log(`[AuthPhoneStart] Code acheminé via ${channel}.`);

    // Le code n'apparaît jamais dans la réponse, ni le canal utilisé (il révélerait si le
    // numéro possède WhatsApp).
    return NextResponse.json({ sent: true, expiresAt: outcome.expiresAt.toISOString() });
  } catch (error: any) {
    console.error('[AuthPhoneStart] Erreur :', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

export function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export const POST = withCors(POSTHandler);
