
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { AlertOctagon, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/use-subscription';
import { TARIFAIRE } from '@/lib/billing-calculator';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

type AlertKind = 'warning' | 'error' | 'info';

const ALERT_STYLES: Record<AlertKind, {
    container: string;
    icon: React.ElementType;
    iconWrap: string;
    title: string;
    description: string;
    button: string;
    label: string;
}> = {
    error: {
        container: 'border-red-300/70 bg-gradient-to-r from-red-50 to-red-100/40 dark:from-red-950/40 dark:to-red-900/20 dark:border-red-800/60',
        icon: AlertOctagon,
        iconWrap: 'bg-red-500 text-white shadow-md shadow-red-500/30',
        title: 'text-red-900 dark:text-red-100',
        description: 'text-red-800/90 dark:text-red-200/90',
        button: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/30',
        label: 'Limite dépassée',
    },
    warning: {
        container: 'border-amber-300/70 bg-gradient-to-r from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20 dark:border-amber-800/60',
        icon: AlertTriangle,
        iconWrap: 'bg-amber-500 text-white shadow-md shadow-amber-500/30',
        title: 'text-amber-900 dark:text-amber-100',
        description: 'text-amber-800/90 dark:text-amber-200/90',
        button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30',
        label: 'Avertissement',
    },
    info: {
        container: 'border-blue-300/70 bg-gradient-to-r from-blue-50 to-blue-100/40 dark:from-blue-950/40 dark:to-blue-900/20 dark:border-blue-800/60',
        icon: Info,
        iconWrap: 'bg-blue-600 text-white shadow-md shadow-blue-500/30',
        title: 'text-blue-900 dark:text-blue-100',
        description: 'text-blue-800/90 dark:text-blue-200/90',
        button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30',
        label: 'Information',
    },
};

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

    const alerts: { type: AlertKind, message: string, href?: string, cta?: string }[] = [];

    if (planDetails) {
        if (studentCount > planDetails.elevesInclus) {
            alerts.push({ type: 'error', message: `Vous avez dépassé la limite de ${planDetails.elevesInclus} élèves.`, href: '/dashboard/parametres/abonnement', cta: 'Mettre à niveau' });
        } else if (studentCount / planDetails.elevesInclus > 0.9) {
            alerts.push({ type: 'warning', message: `Vous approchez la limite d'élèves (${studentCount}/${planDetails.elevesInclus}).`, href: '/dashboard/parametres/abonnement', cta: 'Mettre à niveau' });
        }

        if (cycleCount > planDetails.cyclesInclus) {
            alerts.push({ type: 'error', message: `Vous avez dépassé la limite de ${planDetails.cyclesInclus} cycles.`, href: '/dashboard/parametres/abonnement', cta: 'Mettre à niveau' });
        }
    }

    if (dueStudentsCount > 0) {
        alerts.push({ type: 'info', message: `${dueStudentsCount} élève(s) ont des frais de scolarité impayés.`, href: '/dashboard/paiements', cta: 'Voir la liste' });
    }

    if (loading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-xl" />
            </div>
        );
    }

    if (alerts.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {alerts.map((alert, index) => {
                const styles = ALERT_STYLES[alert.type];
                const Icon = styles.icon;
                return (
                    <div
                        key={index}
                        role="alert"
                        className={cn(
                            'flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md',
                            styles.container,
                        )}
                    >
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconWrap)}>
                            <Icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={cn('text-sm font-semibold leading-tight', styles.title)}>
                                {styles.label}
                            </p>
                            <p className={cn('text-sm font-medium leading-snug mt-0.5', styles.description)}>
                                {alert.message}
                            </p>
                        </div>
                        {alert.href && (
                            <Button asChild size="sm" className={cn('shrink-0 font-semibold', styles.button)}>
                                <Link href={alert.href}>
                                    {alert.cta ?? 'Voir'}
                                    <ArrowRight className="ml-1.5 h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
