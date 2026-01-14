
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/use-subscription';
import { TARIFAIRE } from '@/lib/billing-calculator';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface BillingAlertsProps {
    schoolId: string;
    studentCount: number;
    cycleCount: number;
}

export function BillingAlerts({ schoolId, studentCount, cycleCount }: BillingAlertsProps) {
  const firestore = useFirestore();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  const [dueStudentsCount, setDueStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const dueStudentsQuery = useMemo(() =>
    query(collection(firestore, `ecoles/${schoolId}/eleves`), where('amountDue', '>', 0))
  , [firestore, schoolId]);

  const { data: dueStudentsData, loading: studentsLoading } = useCollection(dueStudentsQuery);
  
  useEffect(() => {
    setLoading(subscriptionLoading || studentsLoading);
    if (!studentsLoading) {
        setDueStudentsCount(dueStudentsData?.length || 0);
    }
  }, [subscriptionLoading, studentsLoading, dueStudentsData]);

  const planDetails = (subscription && subscription.plan && TARIFAIRE[subscription.plan]) 
    ? TARIFAIRE[subscription.plan] 
    : null;

  const alerts: {type: 'warning' | 'error' | 'info', message: string, href?: string}[] = [];

  if (planDetails) {
      if (studentCount > planDetails.elevesInclus) {
          alerts.push({ type: 'error', message: `Vous avez dépassé la limite de ${planDetails.elevesInclus} élèves.`, href: '/dashboard/parametres/abonnement'});
      } else if (studentCount / planDetails.elevesInclus > 0.9) {
          alerts.push({ type: 'warning', message: `Vous approchez la limite d'élèves (${studentCount}/${planDetails.elevesInclus}).`, href: '/dashboard/parametres/abonnement' });
      }

      if (cycleCount > planDetails.cyclesInclus) {
          alerts.push({ type: 'error', message: `Vous avez dépassé la limite de ${planDetails.cyclesInclus} cycles.`, href: '/dashboard/parametres/abonnement' });
      }
  }
  
  if (dueStudentsCount > 0) {
      alerts.push({ type: 'info', message: `${dueStudentsCount} élève(s) ont des frais de scolarité impayés.`, href: '/dashboard/paiements' });
  }

  if (loading) {
      return (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
          </div>
      );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
        {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'} className={cn(
                alert.type === 'warning' && 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 [&>svg]:text-amber-500',
                alert.type === 'info' && 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 [&>svg]:text-blue-500'
            )}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-semibold">
                    {alert.type === 'error' ? 'Limite dépassée' : alert.type === 'warning' ? 'Avertissement' : 'Information'}
                </AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                    {alert.message}
                    {alert.href && (
                        <Button asChild size="sm" variant="link" className="text-current">
                            <Link href={alert.href}>
                                {alert.type === 'info' ? 'Voir la liste' : 'Mettre à niveau'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </AlertDescription>
            </Alert>
        ))}
    </div>
  );
}
