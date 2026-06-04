'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PedagogiePage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/pedagogie/structure');
    }, [router]);
    return null;
}
