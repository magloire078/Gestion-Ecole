'use client';
import ClassDetailsClient from './ClassClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClassDetailsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <ClassDetailsClient />
        </Suspense>
    );
}
