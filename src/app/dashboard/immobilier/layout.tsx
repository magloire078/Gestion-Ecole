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

  // Find the correct tab value. If on a sub-path like /reservations/new, it should still select "Reservations".
  const activeTab = immobilierNavLinks.find(link => pathname.startsWith(link.href))?.href || pathname;

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Gestion Immobilière</h1>
            <p className="text-muted-foreground">
                Gérez l'inventaire, la maintenance et les réservations des locaux.
            </p>
        </div>
        <Tabs value={activeTab} className="w-full">
            <TabsList className="overflow-x-auto whitespace-nowrap h-auto justify-start">
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
