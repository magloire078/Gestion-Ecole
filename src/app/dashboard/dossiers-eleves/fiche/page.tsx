'use client';
import StudentSheetClient from './StudentSheetClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentSheetPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <StudentSheetClient />
        </Suspense>
    );
}
