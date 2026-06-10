'use client';

import { ModuleAccessGuard } from '@/components/layout/module-access-guard';
import { ModuleSubNav } from '@/components/layout/module-sub-nav';
import { rhSubLinks } from '@/lib/nav-links';

export default function RHLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleAccessGuard module="rh" moduleLabel="RH & Paie">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Ressources Humaines & Paie</h1>
                    <p className="text-muted-foreground">
                        Gérez votre personnel, les salaires et les bulletins de paie.
                    </p>
                </div>
                <ModuleSubNav links={rhSubLinks} />
                <div className="mt-6">{children}</div>
            </div>
        </ModuleAccessGuard>
    );
}
