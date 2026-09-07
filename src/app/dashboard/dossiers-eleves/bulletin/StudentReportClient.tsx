'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useSchoolData } from '@/hooks/use-school-data';
import { StudentReportContent, StudentReportPageSkeleton } from '@/components/pedagogie/student-report-content';

function StudentReportClientInner() {
    const searchParams = useSearchParams();
    const eleveId = searchParams.get('id') as string;
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <StudentReportPageSkeleton />;
    }

    if (!schoolId || !schoolData) {
        return <div>École non trouvée. Vérifiez votre association à une école.</div>;
    }

    if (!eleveId) {
        return <div>ID de l&apos;élève manquant dans l&apos;URL.</div>;
    }

    return <StudentReportContent eleveId={eleveId} schoolId={schoolId} schoolData={schoolData} />
}

export default function StudentReportClient() {
    return (
        <Suspense fallback={<StudentReportPageSkeleton />}>
            <StudentReportClientInner />
        </Suspense>
    );
}
