
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore } from '@/firebase';
import { applyPricing, calculateMonthlyUsage, TARIFAIRE, MODULE_PRICES } from '@/lib/billing-calculator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, History } from 'lucide-react';
import Link from 'next/link';

function UsageProgress({ label, current, max, unit, overageCost, overageUnit }: { 
    label: string, 
    current: number, 
    max: number, 
    unit: string,
    overageCost: number,
    overageUnit: string,
}) {
  const percentage = max > 0 && max !== Infinity ? (current / max) * 100 : (current > 0 ? 0 : 0);
  const isOverLimit = max !== Infinity && current > max;
  const extraUsage = current - max;

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-FR')} CFA`;
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={isOverLimit ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}>
          {current} / {max === Infinity ? '∞' : max} {unit}
          {isOverLimit && ' (dépassement)'}
        </span>
      </div>
      <Progress 
        value={Math.min(percentage, 100)} 
        className={isOverLimit ? '[&>div]:bg-red-500' : ''}
      />
      {isOverLimit && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3"/>
          Supplément estimé: +{formatCurrency(extraUsage * overageCost)} ({formatCurrency(overageCost)} par {overageUnit})
        </p>
      )}
    </div>
  );
}


export default function BillingDashboard() {
  const { schoolData, subscription, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBillingData() {
        if (!schoolData?.id || !firestore || !subscription) {
             if (!schoolLoading) setIsLoading(false);
             return;
        };

        setIsLoading(true);
        try {
            const usage = await calculateMonthlyUsage(firestore, schoolData.id);
            const projection = await applyPricing(subscription, usage);
            setBillingInfo({ subscription, usage, projection });
        } catch (error) {
            console.error("Error calculating billing:", error);
        } finally {
            setIsLoading(false);
        }
    }
    
    loadBillingData();
  }, [schoolData, firestore, subscription, schoolLoading]);

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0 CFA';
    return `${value.toLocaleString('fr-FR')} CFA`;
  };

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Skeleton className="h-64 w-full" />
                 <Skeleton className="h-64 w-full" />
                 <Skeleton className="h-64 w-full" />
            </div>
             <Skeleton className="h-32 w-full" />
        </div>
    )
  }

  if (!billingInfo) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Données de facturation non disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Impossible de charger les informations sur l'abonnement et l'utilisation. Veuillez vérifier votre plan d'abonnement ou réessayer plus tard.</p>
              </CardContent>
          </Card>
      );
  }

  const { usage, projection } = billingInfo;
  
  const planDetails = TARIFAIRE[subscription.plan as keyof typeof TARIFAIRE];


  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-lg font-semibold md:text-2xl">Facturation</h1>
            <p className="text-muted-foreground">
                Consultez votre utilisation actuelle et la prévision de votre prochaine facture.
            </p>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan actuel</CardTitle>
            <CardDescription>Votre abonnement en cours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-bold">{subscription.plan}</span>
              <Badge>{subscription.status}</Badge>
            </div>
            <div className="text-4xl font-bold text-primary">
              {formatCurrency(planDetails.prixMensuel)}<span className="text-lg text-muted-foreground">/mois</span>
            </div>
          </CardContent>
           <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard/parametres/abonnement">Changer de plan</Link>
                </Button>
           </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Utilisation ce mois-ci</CardTitle>
             <CardDescription>Votre consommation actuelle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageProgress 
              label="Cycles scolaires"
              current={usage?.cyclesCount || 0}
              max={planDetails.cyclesInclus}
              unit="cycles"
              overageCost={5000}
              overageUnit="cycle"
            />
            <UsageProgress 
              label="Élèves actifs"
              current={usage?.studentsCount || 0}
              max={planDetails.elevesInclus}
              unit="élèves"
              overageCost={250}
              overageUnit="élève"
            />
            <UsageProgress 
              label="Stockage de données"
              current={usage?.storageUsed || 0}
              max={planDetails.stockageInclus}
              unit="Go"
              overageCost={1000}
              overageUnit="Go"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Prévision de la facture</CardTitle>
             <CardDescription>Estimation pour la fin du mois.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Plan de base:</span>
                <span>{formatCurrency(projection.base)}</span>
              </div>
              {projection?.supplements.modules > 0 && (
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                  <span>+ Modules complémentaires:</span>
                  <span>+{formatCurrency(projection.supplements.modules)}</span>
                </div>
              )}
              {projection?.supplements.cycles > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>+ Cycles supplémentaires:</span>
                  <span>+{formatCurrency(projection.supplements.cycles)}</span>
                </div>
              )}
              {projection?.supplements.students > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>+ Élèves supplémentaires:</span>
                  <span>+{formatCurrency(projection.supplements.students)}</span>
                </div>
              )}
               {projection?.supplements.storage > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>+ Stockage supplémentaire:</span>
                  <span>+{formatCurrency(projection.supplements.storage)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total prévisionnel:</span>
                  <span>{formatCurrency(projection.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Gérer votre facturation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline"><History className="mr-2 h-4 w-4"/>Historique</Button>
            <Button variant="outline"><TrendingUp className="mr-2 h-4 w-4"/>Augmenter les limites</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
