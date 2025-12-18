
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { immobilierNavLinks } from './links';
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function ImmobilierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { subscription, loading } = useSubscription();

  if (loading) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-64 w-full" />
          </div>
      );
  }

  if (!subscription || !['Premium'].includes(subscription.plan)) {
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
        <nav className="flex space-x-2 border-b">
            {immobilierNavLinks.map(link => {
                const isActive = pathname.startsWith(link.href);
                return (
                    <Link 
                        href={link.href} 
                        key={link.href}
                        className={cn(
                            "inline-flex items-center shrink-0 justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                            "border-b-2 border-transparent",
                            isActive ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <link.icon className="mr-2 h-4 w-4" />
                        {link.label}
                    </Link>
                );
            })}
        </nav>
        <div className="mt-6">{children}</div>
    </div>
  );
}
