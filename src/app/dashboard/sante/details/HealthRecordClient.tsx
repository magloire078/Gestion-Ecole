'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSchoolData } from '@/hooks/use-school-data';
import { HealthRecordContent, HealthRecordSkeleton } from '@/components/sante/health-record-content';
import { LoadingScreen } from '@/components/ui/loading-screen';

function PageContent() {
    const searchParams = useSearchParams();
    const eleveId = searchParams.get('id') as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <HealthRecordSkeleton />;
    }

    if (!schoolId) {
        return <div>École non trouvée.</div>;
    }

    if (!eleveId) {
        return <div>ID de l&apos;élève manquant.</div>;
    }

    return <HealthRecordContent eleveId={eleveId} schoolId={schoolId} />;
}

export default function HealthRecordClient() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PageContent />
        </Suspense>
    );
}
