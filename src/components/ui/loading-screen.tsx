'use client';

import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Chargement</h2>
          <p className="text-sm text-muted-foreground">Veuillez patienter...</p>
        </div>
      </div>
    </div>
  );
}
