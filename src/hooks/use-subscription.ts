
'use client';

import { useSchoolData } from './use-school-data';

type SubscriptionPlan = 'Essentiel' | 'Pro' | 'Premium';

export interface Subscription {
    plan: SubscriptionPlan;
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    maxStudents?: number;
    maxCycles?: number;
}

export function useSubscription() {
    const { schoolData, loading, updateSchoolData } = useSchoolData();

    const updateSubscription = async (newSubscriptionData: Partial<Subscription>) => {
        // Enveloppe les données de l'abonnement dans l'objet attendu par updateSchoolData
        return updateSchoolData({ subscription: newSubscriptionData });
    };

    return {
        subscription: schoolData?.subscription,
        loading,
        updateSubscription
    };
}
