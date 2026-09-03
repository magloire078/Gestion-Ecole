import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { registerGeniusWebhook, listGeniusWebhooks } from '@/lib/genius-pay';

export const dynamic = 'force-dynamic';

// Événements que notre webhook /api/webhooks/genius sait traiter.
const DEFAULT_EVENTS = [
    'payment.success',
    'payment.failed',
    'payment.cancelled',
    'payment.expired',
    'payment.refunded',
];

// Auth admin : jeton d'ID Firebase + profile.isAdmin (même motif que les
// autres routes /api/admin/*).
async function requireAdmin(request: NextRequest): Promise<{ uid: string } | { error: string; status: number }> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Missing Authorization header', status: 401 };
    }
    const token = authHeader.slice(7);
    let decoded;
    try {
        decoded = await getAdminAuth().verifyIdToken(token);
    } catch (err) {
        console.error('[Admin GeniusWebhook] verifyIdToken failed', err);
        return { error: 'Invalid token', status: 401 };
    }
    const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
    const profile = userSnap.data()?.profile;
    if (!profile?.isAdmin) {
        return { error: 'Admin access required', status: 403 };
    }
    return { uid: decoded.uid };
}

function resolveBaseUrl(req: NextRequest): string {
    const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (env) return env.replace(/\/$/, '');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
    return host ? `${proto}://${host}` : 'https://gerecole.com';
}

/** Liste les webhooks enregistrés côté GeniusPay. */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const data = await listGeniusWebhooks();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}

/**
 * Enregistre (ou ré-enregistre) l'endpoint webhook auprès de GeniusPay.
 * Body optionnel : { url?, events?, name? }. Par défaut, l'URL pointe sur
 * /api/webhooks/genius du domaine courant et tous les événements utiles.
 *
 * ⚠️ La réponse contient le secret `whsec_...` renvoyé UNE SEULE FOIS :
 * copiez-le dans la variable d'environnement GENIUS_WEBHOOK_SECRET puis
 * redéployez.
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({} as any));
    const url = (typeof body?.url === 'string' && body.url.trim())
        ? body.url.trim()
        : `${resolveBaseUrl(request)}/api/webhooks/genius`;
    const events = Array.isArray(body?.events) && body.events.length ? body.events : DEFAULT_EVENTS;
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'GèreEcole';

    try {
        const data = await registerGeniusWebhook({ url, events, name });
        return NextResponse.json({
            success: true,
            note: "Copiez le secret 'whsec_...' ci-dessous dans la variable d'environnement GENIUS_WEBHOOK_SECRET, puis redéployez. Il n'est affiché qu'une seule fois.",
            registeredUrl: url,
            events,
            data,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}
