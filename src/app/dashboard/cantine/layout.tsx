

'use client';

import Link from "next/link";
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from '@/firebase';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cantineSubLinks } from '@/lib/nav-links';

export default function CantineLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { subscription, loading: subscriptionLoading } = useSubscription();
    const { user, loading: userLoading } = useUser();

    const isLoading = subscriptionLoading || userLoading;

    const layoutContent = (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Gestion de la Cantine</h1>
                <p className="text-muted-foreground">
                    Gérez les menus, les réservations et les abonnements.
                </p>
            </div>
            <Tabs value={pathname} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    {cantineSubLinks.map(link => (
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

    if (user?.profile?.isAdmin) {
        return layoutContent;
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

    const hasAccess = subscription?.plan === 'Essentiel' || subscription?.plan === 'Premium' || subscription?.activeModules?.includes('cantine');

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-primary" />
                            Module Cantine
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            La gestion des menus, des réservations et des abonnements de cantine est un module complémentaire. Pour y accéder, veuillez l&apos;activer depuis la page d&apos;abonnement.
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

    return layoutContent;
}

