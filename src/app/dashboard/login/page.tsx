
'use client';
import { redirect } from 'next/navigation';

// Redirige vers la nouvelle page de connexion
export default function DeprecatedLoginPage() {
    redirect('/auth/login');
}
