'use client';

import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncStatus } from '@/hooks/use-sync-status';

/**
 * Bandeau d'état de la synchronisation.
 *
 * Trois situations méritent d'être signalées, par ordre de priorité :
 * 1. une écriture a été refusée au moment de la synchronisation — la donnée disparaît de
 *    l'écran, l'utilisateur doit comprendre pourquoi ;
 * 2. l'appareil est hors ligne — les saisies sont conservées localement ;
 * 3. la synchronisation est en cours après un retour du réseau.
 *
 * En fonctionnement normal (en ligne, rien en attente), le bandeau ne s'affiche pas.
 */
export function SyncStatusBanner() {
    const { isOnline, isSyncing, lastError, clearError } = useSyncStatus();

    if (lastError) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-300/70 bg-red-50/80 px-4 py-2 text-red-900 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    <span>
                        Une modification n&apos;a pas pu être synchronisée ({lastError.operation}
                        {lastError.code ? ` — ${lastError.code}` : ''}). Elle a été annulée&nbsp;:
                        vérifiez vos droits et recommencez.
                    </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-red-900 hover:bg-red-100" onClick={clearError}>
                    Fermer
                </Button>
            </div>
        );
    }

    if (!isOnline) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-300/70 bg-slate-50/80 px-4 py-2 text-sm text-slate-800 shadow-sm backdrop-blur">
                <CloudOff className="h-4 w-4 shrink-0" />
                <span>
                    Hors ligne. Vous pouvez continuer à consulter et à saisir&nbsp;: tout sera
                    synchronisé automatiquement dès le retour du réseau.
                </span>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-300/70 bg-blue-50/80 px-4 py-2 text-sm text-blue-900 shadow-sm backdrop-blur">
                <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                <span>Synchronisation des modifications en cours…</span>
            </div>
        );
    }

    return null;
}
