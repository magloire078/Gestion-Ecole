
'use client';

import Link from "next/link";
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    
    if (subscription?.plan === 'Essentiel') {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-primary" />
                            Module Activités (Plan Pro)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            La gestion des activités parascolaires et des compétitions est une fonctionnalité avancée. Pour y accéder, veuillez mettre à niveau votre abonnement.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/parametres/abonnement">
                                Mettre à niveau vers le Plan Pro
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return <>{children}</>;
}
