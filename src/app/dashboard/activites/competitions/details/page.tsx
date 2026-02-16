'use client';
import CompetitionParticipantsClient from './CompetitionClient';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompetitionDetailsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <CompetitionParticipantsClient />
        </Suspense>
    );
}
