'use client';

import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentIdCard } from '@/components/student-id-card';
import type { student as Student } from '@/lib/data-types';
import { doc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function StudentIdCardPageSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="max-w-md mx-auto">
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    );
}

function StudentCardContent({ eleveId, schoolId, schoolData }: { eleveId: string, schoolId: string, schoolData: any }) {
    const firestore = useFirestore();
    const studentRef = useMemo(() =>
        doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`) as DocumentReference<Student, DocumentData>
        , [firestore, schoolId, eleveId]);

    const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);

    if (studentLoading) {
        return <StudentIdCardPageSkeleton />;
    }

    if (!studentData) {
        notFound();
    }

    const studentWithId = { ...studentData, id: eleveId };
    const studentFullName = `${studentData.lastName ? studentData.lastName.toUpperCase() : ''} ${studentData.firstName || ''}`.trim();

    return (
        <div className="space-y-6 max-w-4xl mx-auto px-4 md:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                    <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">Carte d&apos;étudiant</h1>
                    <p className="text-sm text-slate-500">Voici la carte numérique de {studentFullName}. Elle peut être utilisée pour diverses interactions au sein de l&apos;école.</p>
                </div>
                <Link href={`/dashboard/dossiers-eleves/${eleveId}`} className="no-print self-start sm:self-center">
                    <Button variant="outline" className="rounded-xl hover:scale-105 active:scale-95 transition-all shadow-sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour au dossier
                    </Button>
                </Link>
            </div>
            <div className="pt-4">
                <StudentIdCard
                    student={studentWithId as Student}
                    school={schoolData}
                />
            </div>
        </div>
    );
}

export default function StudentIdCardClient() {
    const params = useParams();
    const eleveId = params.eleveId as string;
    const { schoolData, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <StudentIdCardPageSkeleton />;
    }

    if (!schoolData) {
        return <div>Données de l&apos;école non chargées.</div>
    }

    return <StudentCardContent eleveId={eleveId} schoolId={schoolData.id!} schoolData={schoolData} />;
}
