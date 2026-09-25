import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminNewSchool } from '@/lib/admin-notifier';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { schoolName, schoolId, schoolCode, directorName, directorEmail, directorPhone, country, address } = body;

        if (!schoolName || !schoolId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        await notifyAdminNewSchool({
            schoolName,
            schoolId,
            schoolCode: schoolCode || 'N/A',
            directorName: directorName || 'Directeur',
            directorEmail: directorEmail || '',
            directorPhone,
            country,
            address,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API notify-school-created] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
