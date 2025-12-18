
'use client';

import Link from "next/link";
import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/auth-guard";

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
    const { user, loading: userLoading } = useUser();

    const isLoading = userLoading;

    // This check is important because useUser() can return a non-admin user
    // while still loading the final admin claims.
    const isPotentiallyAdmin = user?.profile?.isAdmin === true || user?.profile?.role === 'directeur';

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
               <p>Vérification des permissions d'administrateur...</p>
            </div>
        );
    }
    
    if (!isPotentiallyAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-muted text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-destructive" />
                            Accès Restreint
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Vous n'avez pas les permissions nécessaires pour accéder à cette section. Elle est réservée aux administrateurs de la plateforme.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard">
                                Retour au Tableau de Bord
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return <>{children}</>;
}


export default function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </AuthGuard>
    )
}
