import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { publishTextPost, publishPhotoPost, getPageInfo } from '@/lib/facebook-pages';

export const dynamic = 'force-dynamic';

/**
 * Auth admin : jeton d'ID Firebase + profile.isAdmin (même motif que les autres
 * routes /api/admin/*).
 */
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
        console.error('[Admin FacebookPublish] verifyIdToken failed', err);
        return { error: 'Invalid token', status: 401 };
    }
    const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
    const profile = userSnap.data()?.profile;
    if (!profile?.isAdmin) {
        return { error: 'Admin access required', status: 403 };
    }
    return { uid: decoded.uid };
}

/**
 * Vérifie la configuration : renvoie les infos de la Page (id, nom, abonnés).
 * Pratique pour tester que FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN sont
 * valides avant de publier.
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const data = await getPageInfo();
        return NextResponse.json({ success: true, page: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}

/**
 * Publie (ou programme) un contenu sur la Page Facebook.
 * Body :
 *   { message?: string, link?: string, photoUrl?: string, scheduledPublishTime?: number }
 * - photoUrl fourni  => publication photo (message devient la légende).
 * - sinon            => publication texte (avec `link` optionnel).
 * - scheduledPublishTime (Unix sec, 10 min–30 j) => publication programmée.
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({} as any));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const link = typeof body?.link === 'string' && body.link.trim() ? body.link.trim() : undefined;
    const photoUrl = typeof body?.photoUrl === 'string' && body.photoUrl.trim() ? body.photoUrl.trim() : undefined;
    const scheduledPublishTime = typeof body?.scheduledPublishTime === 'number' && body.scheduledPublishTime > 0
        ? body.scheduledPublishTime
        : undefined;

    if (!message && !photoUrl) {
        return NextResponse.json({ error: 'Un message ou une photoUrl est requis.' }, { status: 400 });
    }

    try {
        const data = photoUrl
            ? await publishPhotoPost({ message, photoUrl })
            : await publishTextPost({ message, link, scheduledPublishTime });
        return NextResponse.json({
            success: true,
            scheduled: Boolean(scheduledPublishTime),
            data,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}
