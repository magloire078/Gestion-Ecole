
'use client';

import { useSchoolData, type Subscription } from './use-school-data';

export type { Subscription };

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
