'use client';

import Link from "next/link";
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/firebase";

export default function ActivitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const { subscription, loading: subscriptionLoading } = useSubscription();
    const { user, loading: userLoading } = useUser();

    const isLoading = subscriptionLoading || userLoading;
    
    // Admins always have access
    if (user?.profile?.isAdmin) {
        return (
             <div className="space-y-6">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Activités Parascolaires</h1>
                    <p className="text-muted-foreground">Gérez les activités, les inscriptions des élèves et les compétitions.</p>
                </div>
                {children}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    const hasAccess = subscription?.activeModules?.includes('activites') || subscription?.plan === 'Premium';
    
    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-primary" />
                            Module Activités
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            La gestion des activités parascolaires est un module complémentaire. Pour y accéder, veuillez l'activer depuis la page d'abonnement.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/parametres/abonnement">
                                Activer le module
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
                <h1 className="text-lg font-semibold md:text-2xl">Activités Parascolaires</h1>
                <p className="text-muted-foreground">Gérez les activités, les inscriptions des élèves et les compétitions.</p>
            </div>
            {children}
        </div>
    );
}
