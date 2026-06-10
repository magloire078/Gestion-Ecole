'use client';

import { ModuleAccessGuard } from '@/components/layout/module-access-guard';
import { ModuleSubNav } from '@/components/layout/module-sub-nav';
import { internatSubLinks } from '@/lib/nav-links';

export default function InternatLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleAccessGuard module="internat" moduleLabel="Internat">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Gestion de l&apos;Internat</h1>
                    <p className="text-muted-foreground">
                        Gérez les dortoirs, les chambres et les occupants.
                    </p>
                </div>
                <ModuleSubNav links={internatSubLinks} />
                <div className="mt-6">{children}</div>
            </div>
        </ModuleAccessGuard>
    );
}
