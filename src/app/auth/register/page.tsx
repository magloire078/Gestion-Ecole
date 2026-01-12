
'use client';

import { redirect } from 'next/navigation';

// Onboarding is the primary registration flow.
// This page now redirects to the onboarding page.
export default function RegisterRedirectPage() {
    redirect('/onboarding');
    return null;
}
