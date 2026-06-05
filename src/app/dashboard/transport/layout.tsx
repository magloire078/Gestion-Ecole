'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_LINKS } from '@/lib/nav-links';
import { ModuleAccessGuard } from '@/components/layout/module-access-guard';

export default function TransportLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const transportNavLinks = NAV_LINKS.find(g => g.group === 'Vie Scolaire')?.links.filter(
        l => l.href.startsWith('/dashboard/transport')
    ) || [];

    return (
        <ModuleAccessGuard module="transport" moduleLabel="Transport">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Gestion du Transport</h1>
                    <p className="text-muted-foreground">
                        Suivez vos bus, gérez les lignes et les abonnements des élèves.
                    </p>
                </div>
                <Tabs value={pathname} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        {transportNavLinks.map(link => (
                            <Link href={link.href} key={link.href} passHref legacyBehavior>
                                <TabsTrigger value={link.href}>
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.label}
                                </TabsTrigger>
                            </Link>
                        ))}
                    </TabsList>
                </Tabs>
                <div className="mt-6">{children}</div>
            </div>
        </ModuleAccessGuard>
    );
}
