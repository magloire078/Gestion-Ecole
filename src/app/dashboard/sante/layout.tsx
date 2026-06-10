'use client';

import { ModuleAccessGuard } from '@/components/layout/module-access-guard';

export default function SanteLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleAccessGuard module="sante" moduleLabel="Santé">
            {children}
        </ModuleAccessGuard>
    );
}
