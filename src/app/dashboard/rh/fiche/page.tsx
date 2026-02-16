'use client';
import StaffSheetClient from './StaffSheetClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaffSheetPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <StaffSheetClient />
        </Suspense>
    );
}
