
'use client';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// La logique est désormais centralisée dans /onboarding
export default function OnboardingRedirect() {
    useEffect(() => {
        redirect('/onboarding');
    }, []);
    return null;
}
