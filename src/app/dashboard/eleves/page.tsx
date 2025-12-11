
'use client';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function OldStudentsPage() {
  useEffect(() => {
    redirect('/dashboard/dossiers-eleves');
  }, []);

  return null; 
}

    