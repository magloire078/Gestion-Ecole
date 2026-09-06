'use client';

import { useParams } from 'next/navigation';
import { useSchoolData } from '@/hooks/use-school-data';
import { StudentReportContent, StudentReportPageSkeleton } from '@/components/pedagogie/student-report-content';

export default function StudentReportClient() {
    const params = useParams();
    const eleveId = params.eleveId as string;
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <StudentReportPageSkeleton />;
    }

    if (!schoolId || !schoolData) {
        return <div>École non trouvée. Vérifiez votre association à une école.</div>;
    }

    return <StudentReportContent eleveId={eleveId} schoolId={schoolId} schoolData={schoolData} />
}
