
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { immobilierNavLinks } from './links';
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImmobilierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { subscription, loading } = useSubscription();

  // Find the correct tab value. If on a sub-path like /reservations/new, it should still select "Reservations".
  const activeTab = immobilierNavLinks.find(link => pathname.startsWith(link.href))?.href || pathname;

  if (loading) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-64 w-full" />
          </div>
      );
  }

  if (subscription?.plan !== 'Premium') {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
              <Card className="max-w-lg">
                  <CardHeader>
                      <CardTitle className="flex items-center justify-center gap-2">
                          <Lock className="h-6 w-6 text-primary" />
                          Module Immobilier (Plan Premium)
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">
                          La gestion immobilière (inventaire, maintenance, réservations) est une fonctionnalité du plan Premium.
                      </p>
                  </CardContent>
                  <CardFooter>
                      <Button asChild className="w-full">
                          <Link href="/dashboard/parametres/abonnement">
                              Découvrir le Plan Premium
                          </Link>
                      </Button>
                  </CardFooter>
              </Card>
          </div>
      );
  }

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
