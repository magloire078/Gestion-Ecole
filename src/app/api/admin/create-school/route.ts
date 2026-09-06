import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const rateLimitCache = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const limit = 3;

    let record = rateLimitCache.get(ip);
    if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        rateLimitCache.set(ip, record);
        return true;
    }
    
    if (record.count >= limit) {
        return false;
    }
    
    record.count++;
    return true;
}

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ error: "Trop de requêtes. Veuillez réessayer plus tard." }, { status: 429 });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
        }
        
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await getAdminAuth().verifyIdToken(token);
        const uid = decodedToken.uid;

        const body = await req.json();
        
        if (uid !== body.directorId) {
            return NextResponse.json({ error: "Non autorisé. directeurId invalide." }, { status: 401 });
        }

        const adminDb = getAdminDb();
        const batch = adminDb.batch();

        // 0. Check limits
        const schoolsSnapshot = await adminDb.collection('ecoles').where('directorId', '==', uid).get();
        if (!schoolsSnapshot.empty) {
            const hasActiveSubscription = schoolsSnapshot.docs.some(doc => {
                const school = doc.data();
                return school.subscription?.status === 'active';
            });
            if (!hasActiveSubscription) {
                return NextResponse.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
            }
        }

        // 1. Generate ID and code
        const schoolRef = adminDb.collection('ecoles').doc();
        const schoolId = schoolRef.id;
        const prefix = body.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const schoolCode = `${prefix}-${randomNumber}`;

        // 2. Create school doc
        batch.set(schoolRef, {
            name: body.name,
            country: body.country || 'CI',
            region: body.region || '',
            drena: body.drena || '',
            address: body.address || '',
            phone: body.phone || '',
            email: body.email || '',
            mainLogoUrl: body.mainLogoUrl || '',
            website: '',
            directorId: uid,
            directorFirstName: body.directorFirstName || '',
            directorLastName: body.directorLastName || '',
            directorEmail: body.directorEmail || '',
            schoolCode,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            status: 'active',
            subscription: {
                plan: 'Essentiel',
                status: 'trialing',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                maxStudents: 50,
                maxCycles: 5,
            }
        });

        // 3. Update user
        const userRef = adminDb.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            batch.set(userRef, {
                uid: uid,
                email: body.directorEmail,
                schools: { [schoolId]: 'directeur' },
                activeSchoolId: schoolId,
                displayName: `${body.directorFirstName} ${body.directorLastName}`.trim(),
                createdAt: FieldValue.serverTimestamp(),
            });
        } else {
            batch.update(userRef, {
                [`schools.${schoolId}`]: 'directeur',
                activeSchoolId: schoolId,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        // 4. Create personnel profile
        const personnelRef = adminDb.collection('ecoles').doc(schoolId).collection('personnel').doc(uid);
        batch.set(personnelRef, {
            uid: uid,
            schoolId,
            firstName: body.directorFirstName,
            lastName: body.directorLastName,
            displayName: `${body.directorFirstName} ${body.directorLastName}`.trim(),
            email: body.directorEmail,
            role: 'directeur',
            status: "Actif",
            hireDate: new Date().toISOString().split('T')[0],
            baseSalary: 0,
            photoURL: '',
        });

        await batch.commit();

        return NextResponse.json({ success: true, schoolId, schoolCode });

    } catch (error: any) {
        console.error("[CreateSchoolAPI] Erreur:", error);
        return NextResponse.json({ error: error.message || "Erreur lors de la création de l'école." }, { status: 500 });
    }
}
