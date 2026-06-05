'use client';

import { ModuleAccessGuard } from '@/components/layout/module-access-guard';
import { ModuleSubNav } from '@/components/layout/module-sub-nav';
import { cantineSubLinks } from '@/lib/nav-links';

export default function CantineLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleAccessGuard module="cantine" moduleLabel="Cantine">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Gestion de la Cantine</h1>
                    <p className="text-muted-foreground">
                        Gérez les menus, les réservations et les abonnements.
                    </p>
                </div>
                <ModuleSubNav links={cantineSubLinks} />
                <div className="mt-6">{children}</div>
            </div>
        </ModuleAccessGuard>
    );
}
