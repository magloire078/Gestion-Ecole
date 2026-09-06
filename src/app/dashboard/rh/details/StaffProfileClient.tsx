'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StaffProfileContent, StaffDetailSkeleton } from '@/components/rh/staff-profile-content';

function StaffProfilePageContent() {
    const searchParams = useSearchParams();
    const staffId = searchParams.get('id') as string;

    return (
        <StaffProfileContent
            staffId={staffId}
            ficheHref={`/dashboard/rh/fiche?id=${staffId}`}
            bulletinHref={`/dashboard/rh/bulletin?id=${staffId}`}
        />
    );
}

export default function StaffProfileClient() {
    return (
        <Suspense fallback={<StaffDetailSkeleton />}>
            <StaffProfilePageContent />
        </Suspense>
    );
}
