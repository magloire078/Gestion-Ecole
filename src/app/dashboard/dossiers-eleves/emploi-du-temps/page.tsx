'use client';
import StudentTimetableClient from './StudentTimetableClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentTimetablePage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <StudentTimetableClient />
        </Suspense>
    );
}
