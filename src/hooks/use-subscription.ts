'use client';

import { useSchoolData, type Subscription } from './use-school-data';

export type { Subscription };

export function useSubscription() {
    const { schoolData, loading, updateSchoolData } = useSchoolData();
    const subscription = schoolData?.subscription;
    const isExpired = subscription?.endDate ? new Date(subscription.endDate) < new Date() : false;
    const daysLeft = subscription?.endDate ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;

    const updateSubscription = async (newSubscriptionData: Partial<Subscription>) => {
        const currentSubscription = schoolData?.subscription || {};
        const mergedSubscription = { ...currentSubscription, ...newSubscriptionData };
        return updateSchoolData({ subscription: mergedSubscription as Subscription });
    };

    return {
        subscription,
        loading,
        updateSubscription,
        isExpired,
        daysLeft,
        status: isExpired ? 'expired' : (daysLeft <= 7 ? 'warning' : 'active')
    };
}
