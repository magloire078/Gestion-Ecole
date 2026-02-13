
'use client';

import { useSchoolData, type Subscription } from './use-school-data';

export type { Subscription };

export function useSubscription() {
    const { schoolData, loading, updateSchoolData } = useSchoolData();

    const updateSubscription = async (newSubscriptionData: Partial<Subscription>) => {
        const currentSubscription = schoolData?.subscription || {};
        const mergedSubscription = { ...currentSubscription, ...newSubscriptionData };
        return updateSchoolData({ subscription: mergedSubscription as Subscription });
    };

    return {
        subscription: schoolData?.subscription,
        loading,
        updateSubscription
    };
}
