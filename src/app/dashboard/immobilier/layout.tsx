'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { immobilierNavLinks } from './links';

export default function ImmobilierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Gestion Immobilière</h1>
            <p className="text-muted-foreground">
                Gérez l'inventaire, la maintenance et les réservations des locaux.
            </p>
        </div>
        <Tabs value={pathname} className="w-full">
            <TabsList>
                {immobilierNavLinks.map(link => (
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
