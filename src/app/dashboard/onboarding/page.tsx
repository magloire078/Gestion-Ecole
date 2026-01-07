
'use client';
import { redirect } from 'next/navigation';

// La logique est désormais centralisée dans /onboarding
export default function OnboardingRedirect() {
    redirect('/onboarding');
}
