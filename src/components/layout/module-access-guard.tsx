'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, AlertTriangle } from 'lucide-react';
import { useUser } from '@/firebase';
import { useSubscription } from '@/hooks/use-subscription';
import { canAccessModule, isSubscriptionEffectivelyActive } from '@/lib/subscription-guards';
import type { ModuleName } from '@/lib/subscription-plans';

interface Props {
    module: ModuleName;
    moduleLabel: string;
    children: ReactNode;
}

export function ModuleAccessGuard({ module, moduleLabel, children }: Props) {
    const { subscription, loading: subscriptionLoading } = useSubscription();
    const { user, loading: userLoading } = useUser();

    if (user?.profile?.isAdmin) return <>{children}</>;

    if (subscriptionLoading || userLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!isSubscriptionEffectivelyActive(subscription)) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                            Abonnement inactif
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Votre abonnement est expiré ou suspendu. Renouvelez-le pour accéder au module {moduleLabel}.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/parametres/abonnement">Voir mon abonnement</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!canAccessModule(subscription, module)) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-primary" />
                            Module {moduleLabel}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Ce module est complémentaire. Activez-le depuis votre abonnement
                            (payable à la carte sur les plans Essentiel et Pro, inclus en Premium).
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/parametres/abonnement">Activer le module</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
