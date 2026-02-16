'use client';
import StudentProfileClient from './StudentProfileClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentProfilePage() {
    return (
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <StudentProfileClient />
        </Suspense>
    );
}
