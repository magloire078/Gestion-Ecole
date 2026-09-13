'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StaffSheetContent, StaffSheetSkeleton } from '@/components/rh/staff-sheet-content';

function StaffSheetPageContent() {
    const searchParams = useSearchParams();
    const staffId = searchParams.get('id') as string;

    return <StaffSheetContent staffId={staffId} />;
}

export default function StaffSheetClient() {
    return (
        <Suspense fallback={<StaffSheetSkeleton />}>
            <StaffSheetPageContent />
        </Suspense>
    );
}
