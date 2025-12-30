
'use client';
import { redirect } from 'next/navigation';

// This page is being repurposed. The content is moved to bulletin/page.tsx
// A new "Fiche" component will be created later.
export default function StaffFichePageRedirect() {
    redirect('../bulletin');
}
