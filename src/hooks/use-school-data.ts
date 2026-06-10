

'use client';

import { useSchoolContext } from '@/providers/school-provider';

// Export the Subscription interface for legacy imports
export interface Subscription {
    plan: 'Essentiel' | 'Pro' | 'Premium';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    endDate?: string;
    maxStudents?: number;
    maxCycles?: number;
    activeModules?: ('sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh')[];
}

export function useSchoolData() {
    return useSchoolContext();
}
