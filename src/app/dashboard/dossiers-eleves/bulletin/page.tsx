'use client';
import StudentReportClient from './StudentReportClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentReportPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <StudentReportClient />
        </Suspense>
    );
}
