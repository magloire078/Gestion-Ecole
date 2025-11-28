
'use client';

import { useSchoolData } from './use-school-data';

type SubscriptionPlan = 'Essentiel' | 'Pro';

export interface Subscription {
    plan: SubscriptionPlan;
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
}

export function useSubscription() {
    const { subscription, loading, updateSchoolData } = useSchoolData();

    const updateSubscription = async (newSubscriptionData: Partial<Subscription>) => {
        // Enveloppe les données de l'abonnement dans l'objet attendu par updateSchoolData
        return updateSchoolData({ subscription: newSubscriptionData });
    };

    return {
        subscription,
        loading,
        updateSubscription
    };
}

    