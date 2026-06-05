'use client';

import { ModuleAccessGuard } from '@/components/layout/module-access-guard';
import { ModuleSubNav } from '@/components/layout/module-sub-nav';
import { immobilierSubLinks } from '@/lib/nav-links';

export default function ImmobilierLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleAccessGuard module="immobilier" moduleLabel="Immobilier">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Gestion Immobilière</h1>
                    <p className="text-muted-foreground">
                        Gérez les biens, les locaux et la maintenance de votre établissement.
                    </p>
                </div>
                <ModuleSubNav links={immobilierSubLinks} />
                <div className="mt-6">{children}</div>
            </div>
        </ModuleAccessGuard>
    );
}
