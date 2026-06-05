'use client';

import { ModuleAccessGuard } from '@/components/layout/module-access-guard';
import { ModuleSubNav } from '@/components/layout/module-sub-nav';
import { activitesSubLinks } from '@/lib/nav-links';

export default function ActivitesLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleAccessGuard module="activites" moduleLabel="Activités">
            <div className="space-y-6">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Activités Parascolaires</h1>
                    <p className="text-muted-foreground">
                        Gérez les activités, les inscriptions des élèves et les compétitions.
                    </p>
                </div>
                <ModuleSubNav links={activitesSubLinks} />
                <div className="mt-6">{children}</div>
            </div>
        </ModuleAccessGuard>
    );
}
