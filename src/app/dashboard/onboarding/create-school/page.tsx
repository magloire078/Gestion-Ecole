
'use client';
import { redirect } from 'next/navigation';

// La logique est désormais centralisée dans /onboarding/create-school
export default function CreateSchoolRedirect() {
    redirect('/onboarding/create-school');
}
