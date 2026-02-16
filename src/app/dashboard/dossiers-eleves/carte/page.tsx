'use client';
import StudentIdCardClient from './StudentIdCardClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentIdCardPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <StudentIdCardClient />
        </Suspense>
    );
}
