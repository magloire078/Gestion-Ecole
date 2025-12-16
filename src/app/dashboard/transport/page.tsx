
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TransportDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/transport/lignes');
  }, [router]);

  return null;
}
