'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RHPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/rh/dashboard');
    }, [router]);
    return null;
}
