
'use client';
import { redirect } from 'next/navigation';

// Redirige vers la page principale de gestion du personnel
export default function PersonnelPageRedirect() {
    redirect('/dashboard/rh/personnel');
}
