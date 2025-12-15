'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { transportNavLinks } from './links';

export default function TransportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Gestion du Transport</h1>
            <p className="text-muted-foreground">
                Suivez vos bus, gérez les lignes et les abonnements des élèves.
            </p>
        </div>
        <Tabs value={pathname} className="w-full">
            <TabsList>
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
  );
}
