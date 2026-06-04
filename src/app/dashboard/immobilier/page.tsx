'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImmobilierPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/immobilier/dashboard');
    }, [router]);
    return null;
}
