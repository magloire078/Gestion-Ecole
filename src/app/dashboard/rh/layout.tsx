
'use client';

import Link from "next/link";
import { NAV_LINKS } from '@/lib/nav-links';
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function RHLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const rhNavLinks = NAV_LINKS.find(g => g.group === 'RH & Paie')?.links || [];

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Ressources Humaines & Paie</h1>
            <p className="text-muted-foreground">
                Gérez votre personnel, les salaires et les bulletins de paie.
            </p>
        </div>
        <Tabs value={pathname} className="w-full">
            <TabsList>
                {rhNavLinks.map(link => (
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
