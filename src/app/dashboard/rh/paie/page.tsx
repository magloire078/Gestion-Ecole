
'use client';

import Link from "next/link";
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/firebase";

export default function PaiePage() {
    const { subscription, loading: subscriptionLoading } = useSubscription();
    const { user, loading: userLoading } = useUser();

    const isLoading = subscriptionLoading || userLoading;

    if (user?.profile?.isAdmin) {
        return <PaieContent />;
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
    
    const hasAccess = subscription?.plan === 'Pro' || subscription?.plan === 'Premium' || subscription?.activeModules?.includes('rh');

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-primary" />
                            Module Paie
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            La gestion avancée de la paie est un module complémentaire ou inclus dans les plans Pro et Premium.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/parametres/abonnement">
                                Gérer mon abonnement
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return <PaieContent />;
}


function PaieContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestion de la Paie</CardTitle>
                <CardDescription>
                    Générez et consultez les bulletins de paie de votre personnel.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">
                    La fonctionnalité complète de gestion de la paie est en cours de développement. Actuellement, vous pouvez générer un aperçu de bulletin de paie depuis le profil d'un membre du personnel.
                </p>
            </CardContent>
        </Card>
    );
}

