'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface LoadingScreenProps {
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function LoadingScreen({ message = "Chargement", showRetry, onRetry }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="space-y-6 max-w-sm">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{message}</h2>
          <p className="text-sm text-muted-foreground italic">
            {showRetry 
              ? "Le chargement semble prendre plus de temps que prévu. Cela peut être dû à votre connexion réseau."
              : "Veuillez patienter pendant que nous préparons votre espace..."}
          </p>
        </div>
        
        {showRetry && (
          <Button 
            onClick={() => onRetry ? onRetry() : window.location.reload()} 
            variant="outline" 
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer ou Recharger
          </Button>
        )}
      </div>
    </div>
  );
}
