
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
import { motion, AnimatePresence } from 'framer-motion';

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

    const alerts: { type: 'warning' | 'error' | 'info', message: string, href?: string }[] = [];

    if (planDetails) {
        if (studentCount > planDetails.elevesInclus) {
            alerts.push({ type: 'error', message: `Vous avez dépassé la limite de ${planDetails.elevesInclus} élèves.`, href: '/dashboard/parametres/abonnement' });
        } else if (studentCount / planDetails.elevesInclus > 0.9) {
            alerts.push({ type: 'warning', message: `Vous approchez la limite d&apos;élèves (${studentCount}/${planDetails.elevesInclus}).`, href: '/dashboard/parametres/abonnement' });
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
            <div className="space-y-4">
                <Skeleton className="h-24 w-full bg-slate-200/50 rounded-xl" />
            </div>
        );
    }

    if (alerts.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {alerts.map((alert, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={cn(
                            "relative overflow-hidden p-5 rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl transition-all duration-300",
                            alert.type === 'error' && "border-rose-200 shadow-rose-100/50",
                            alert.type === 'warning' && "border-amber-200 shadow-amber-100/50",
                            alert.type === 'info' && "border-indigo-200 shadow-indigo-100/50"
                        )}
                    >
                        {/* Subtle background glow */}
                        <div className={cn(
                            "absolute top-0 right-0 w-40 h-40 -mr-20 -mt-20 blur-3xl opacity-15 rounded-full",
                            alert.type === 'error' && "bg-rose-400",
                            alert.type === 'warning' && "bg-amber-400",
                            alert.type === 'info' && "bg-indigo-400"
                        )} />

                        <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <div className={cn(
                                    "p-3 rounded-xl border shadow-sm",
                                    alert.type === 'error' && "bg-rose-100 border-rose-200 text-rose-600",
                                    alert.type === 'warning' && "bg-amber-100 border-amber-200 text-amber-600",
                                    alert.type === 'info' && "bg-indigo-100 border-indigo-200 text-indigo-600"
                                )}>
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-black tracking-tight text-lg text-slate-900">
                                        {alert.type === 'error' ? 'Limite dépassée' : alert.type === 'warning' ? 'Avertissement' : 'Information'}
                                    </h4>
                                    <p className="text-sm font-medium text-slate-500">
                                        {alert.message}
                                    </p>
                                </div>
                            </div>

                            {alert.href && (
                                <Button asChild size="sm" className={cn(
                                    "rounded-xl font-black px-6 h-12 shadow-lg relative group transition-all duration-300 active:scale-95 shrink-0",
                                    alert.type === 'error' && "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200",
                                    alert.type === 'warning' && "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200",
                                    alert.type === 'info' && "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                                )}>
                                    <Link href={alert.href}>
                                        {alert.type === 'info' ? 'Voir la liste' : 'Mettre à niveau'}
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
