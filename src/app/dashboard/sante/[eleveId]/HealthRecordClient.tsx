'use client';

import { useParams } from 'next/navigation';
import { useSchoolData } from '@/hooks/use-school-data';
import { HealthRecordContent, HealthRecordSkeleton } from '@/components/sante/health-record-content';

export default function HealthRecordClient() {
    const params = useParams();
    const eleveId = params.eleveId as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <HealthRecordSkeleton />;
    }

    if (!schoolId) {
        return <div>École non trouvée.</div>;
    }

    return <HealthRecordContent eleveId={eleveId} schoolId={schoolId} />;
}
