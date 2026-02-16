'use client';
import HealthRecordClient from './HealthRecordClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaticHealthRecordPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <HealthRecordClient />
        </Suspense>
    );
}
