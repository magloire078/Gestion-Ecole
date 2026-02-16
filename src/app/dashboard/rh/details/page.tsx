'use client';
import StaffProfileClient from './StaffProfileClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaffProfilePage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <StaffProfileClient />
        </Suspense>
    );
}
