'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TransportPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/dashboard/transport/dashboard');
    }, [router]);
    
    return null;
}
