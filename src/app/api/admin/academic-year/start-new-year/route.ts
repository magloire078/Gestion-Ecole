import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import {
    hasManageClassesPermission,
    startNewAcademicYear,
    YearTransitionConflictError,
    YearTransitionNotFoundError,
    YearTransitionValidationError,
} from '@/lib/admin-academic-year';

interface StartNewYearBody {
    schoolId?: string;
    toYear?: string;
    notes?: string;
}

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    let uid: string;
    let userName: string | undefined;
    try {
        const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
        uid = decoded.uid;
        userName = typeof decoded.name === 'string' ? decoded.name : undefined;
    } catch (err) {
        console.error('[start-new-year] verifyIdToken failed', err);
        return NextResponse.json({ error: 'Session invalide, reconnectez-vous.' }, { status: 401 });
    }

    let body: StartNewYearBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }

    const { schoolId, toYear, notes } = body;
    if (!schoolId || !toYear) {
        return NextResponse.json({ error: "L'ID de l'école et l'année cible sont requis." }, { status: 400 });
    }

    const db = getAdminDb();

    const authorized = await hasManageClassesPermission(db, uid, schoolId);
    if (!authorized) {
        return NextResponse.json({ error: "Vous n'avez pas la permission de gérer les classes de cette école." }, { status: 403 });
    }

    try {
        const result = await startNewAcademicYear(db, { schoolId, toYear, notes, userId: uid, userName });
        return NextResponse.json(result, { status: 200 });
    } catch (err: any) {
        if (err instanceof YearTransitionValidationError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        if (err instanceof YearTransitionConflictError) {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }
        if (err instanceof YearTransitionNotFoundError) {
            return NextResponse.json({ error: err.message }, { status: 404 });
        }
        console.error('[start-new-year] échec inattendu', err);
        return NextResponse.json({ error: err?.message ?? 'Erreur inconnue.' }, { status: 500 });
    }
}
