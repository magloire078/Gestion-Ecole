
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
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {transportNavLinks.map(link => (
                 <Link href={link.href} key={link.href}>
                    <TabsTrigger 
                        value={link.href} 
                        className={`data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none ${pathname === link.href ? 'bg-primary/10 text-primary shadow-none' : ''}`}
                    >
                         <link.icon className="mr-2 h-4 w-4" />
                        {link.label}
                    </TabsTrigger>
                </Link>
            ))}
        </div>
        <div>{children}</div>
    </div>
  );
}
