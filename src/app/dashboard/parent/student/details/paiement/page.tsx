'use client';
import TuitionPaymentClient from './TuitionPaymentClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaticTuitionPaymentPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <TuitionPaymentClient />
        </Suspense>
    );
}
