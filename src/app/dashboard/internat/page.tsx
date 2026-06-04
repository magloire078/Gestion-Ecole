
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InternatPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/internat/dashboard');
    }, [router]);
    return null;
}
