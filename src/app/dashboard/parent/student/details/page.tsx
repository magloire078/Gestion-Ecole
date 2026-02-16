'use client';
import ParentStudentClient from './ParentStudentClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaticParentStudentProfilePage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <ParentStudentClient />
        </Suspense>
    );
}
