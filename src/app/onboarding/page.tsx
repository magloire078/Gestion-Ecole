
'use client';

import { AuthGuard } from "@/components/auth-guard";
import OnboardingPageClient from '../dashboard/onboarding/onboarding-page-client';

function SecuredOnboardingPage() {
    return (
        <AuthGuard>
            <OnboardingPageClient />
        </AuthGuard>
    )
}

export default SecuredOnboardingPage;
