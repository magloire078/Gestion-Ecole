'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OldStudentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard/dossiers-eleves');
  }, [router]);

  return null;
}
