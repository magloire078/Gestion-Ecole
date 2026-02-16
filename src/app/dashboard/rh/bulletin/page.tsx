'use client';
import StaffPayslipClient from './StaffPayslipClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaffPayslipPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <StaffPayslipClient />
        </Suspense>
    );
}
