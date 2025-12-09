'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileSignature, FileText, CalendarDays } from 'lucide-react';
import React from 'react';

export default function StudentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { eleveId: string };
}) {
  const router = useRouter();

  // --- DEBUGGING STEP ---
  // This log will appear on the SERVER console (your terminal)
  console.log('--- LAYOUT PARAMS (SERVER) ---', params);
  // ----------------------

  return (
    <div className="space-y-6">
      {/* This layout is now part of the new route, but the content is being moved.
          The parent layout will handle the main structure. We keep this file
          to ensure all related student pages share a common sub-layout if needed in the future,
          but for now, the main actions are on the page itself.
      */}
      {children}
    </div>
  );
}
