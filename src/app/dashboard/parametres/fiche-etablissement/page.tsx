'use client';

import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { SchoolInfoSheet } from '@/components/school-info-sheet';
import type { school as School } from '@/lib/data-types';
import React, { Component, ErrorInfo, ReactNode } from 'react';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500 font-mono text-sm bg-red-50 border border-red-200 rounded-lg whitespace-pre-wrap">{this.state.error?.toString()}</div>;
    }
    return this.props.children;
  }
}

export default function SchoolSheetPage() {
  const { schoolData, loading: schoolLoading } = useSchoolData();

  if (schoolLoading) {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
        </div>
    );
  }
  
  if (!schoolData) {
      return <div>Informations de l'école non trouvées.</div>
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Fiche de renseignements de l'établissement</h1>
          <p className="text-muted-foreground">Cliquez sur le bouton ci-dessous pour imprimer la fiche.</p>
        </div>
        <SchoolInfoSheet 
          school={schoolData as School}
        />
      </div>
    </ErrorBoundary>
  );
}

