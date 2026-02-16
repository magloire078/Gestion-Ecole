'use client';

import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { doc, type DocumentReference } from 'firebase/firestore';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { TeacherInfoSheet } from '@/components/teacher-info-sheet';
import type { staff as Staff, school as School } from '@/lib/data-types';

interface SchoolInfo extends School {
    name: string;
    address?: string;
    mainLogoUrl?: string;
    directorFirstName: string;
    directorLastName: string;
}

export default function StaffSheetClient() {
    const params = useParams();
    const staffId = params.staffId as string;
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const staffRef = useMemo(() =>
        (schoolId && staffId) ? doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`) as DocumentReference<Staff> : null
        , [schoolId, staffId, firestore]);

    const { data: staffData, loading: staffLoading } = useDoc<Staff>(staffRef);

    const isLoading = schoolLoading || staffLoading;

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
            </div>
        );
    }

    if (!staffData || !schoolData) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Fiche de Renseignements de {staffData.firstName} {staffData.lastName}</h1>
                <p className="text-muted-foreground">Cliquez sur le bouton ci-dessous pour imprimer la fiche.</p>
            </div>
            <TeacherInfoSheet
                teacher={staffData as Staff & { id: string }}
                school={schoolData as SchoolInfo}
            />
        </div>
    );
}
