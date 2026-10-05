'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard] Erreur de page :', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-2xl font-black tracking-tight text-slate-900">
        Cette page n'a pas pu s'afficher
      </h2>
      <p className="max-w-md text-sm text-slate-500">
        Une erreur est survenue. Réessayez, ou revenez au tableau de bord.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="rounded-xl">
          Réessayer
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <a href="/dashboard">Tableau de bord</a>
        </Button>
      </div>
    </div>
  );
}
