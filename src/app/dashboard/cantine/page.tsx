
'use client';

import { DailyMenu } from '@/components/cantine/daily-menu';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SubscriptionList } from '@/components/cantine/subscription-list';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CantinePage() {
  const { schoolId, loading } = useSchoolData();

  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-64 md:col-span-1" />
                <Skeleton className="h-96 md:col-span-2" />
            </div>
        </div>
    );
  }

  if (!schoolId) {
    return <div>Erreur : ID de l'école non trouvé.</div>;
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion de la Cantine</h1>
            <p className="text-muted-foreground">
                Consultez les menus, gérez les réservations et les abonnements.
            </p>
        </div>
        <Tabs defaultValue="menu" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="menu">Menus</TabsTrigger>
                <TabsTrigger value="reservations">Réservations</TabsTrigger>
                <TabsTrigger value="abonnements">Abonnements</TabsTrigger>
            </TabsList>
            <TabsContent value="menu" className="mt-6">
                <DailyMenu schoolId={schoolId} />
            </TabsContent>
            <TabsContent value="reservations">
                 <Card className="flex flex-col items-center justify-center h-64 text-center">
                    <CardHeader>
                        <CardTitle>Gestion des Réservations</CardTitle>
                        <CardDescription>
                            Accédez à la page dédiée pour voir et gérer toutes les réservations de repas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/cantine/reservations">
                                Voir les réservations
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="abonnements" className="mt-6">
                <SubscriptionList schoolId={schoolId} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
