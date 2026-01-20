
'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { KeyRound } from 'lucide-react';

export function ParentAccessGenerator() {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0} className="w-full">
                        <Button variant="secondary" className="w-full" disabled>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Gérer l'accès parent
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>La gestion des comptes parents sera bientôt disponible.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
