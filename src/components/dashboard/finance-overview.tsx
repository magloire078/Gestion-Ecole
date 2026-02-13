'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { useUserSession } from '@/hooks/use-user-session';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import Link from 'next/link';

interface FinanceOverviewProps {
    schoolId: string;
}

export function FinanceOverview({ schoolId: propSchoolId }: FinanceOverviewProps) {
    const firestore = useFirestore();
    const { schoolId: sessionSchoolId, isLoading: sessionLoading } = useUserSession();
    const schoolId = propSchoolId || sessionSchoolId;

    const studentsQuery = useMemo(() => {
        if (!firestore || !schoolId) return null;
        // WARNING: Fetching all students to calculate totals is not scalable.
        // It will become very slow as the school grows.
        // TODO: Move these calculations to a Cloud Function and store in a 'school_stats' document.
        return query(collection(firestore, `ecoles/${schoolId}/eleves`));
    }, [firestore, schoolId]);

    const { data: studentsData, loading: collectionLoading } = useCollection(studentsQuery);
    const loading = sessionLoading || collectionLoading;

    const [financeStats, setFinanceStats] = useState({
        totalFees: 0,
        totalDue: 0,
        paidPercentage: 0
    });

    useEffect(() => {
        if (studentsData) {
            let totalFees = 0;
            let totalDue = 0;
            studentsData.forEach(doc => {
                const student = doc.data();
                totalFees += student.tuitionFee || 0;
                totalDue += student.amountDue || 0;
            });
            const paidPercentage = totalFees > 0 ? ((totalFees - totalDue) / totalFees) * 100 : 100;

            setFinanceStats({ totalFees, totalDue, paidPercentage });
        }
    }, [studentsData]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="glass-card overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold">Aperçu Financier</CardTitle>
                        {process.env.NODE_ENV === 'development' && (
                            <div className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Performance: Fetiches tous les élèves. À optimiser via Stats Doc.">
                                DEV: Scalability
                            </div>
                        )}
                    </div>
                    <CardDescription>État des paiements de scolarité.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold">Taux de recouvrement</span>
                            <span className="text-sm font-black text-primary">{financeStats.paidPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${financeStats.paidPercentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-primary to-cyan-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Total Encaissé</span>
                            <span className="text-sm font-bold text-emerald-700">{(financeStats.totalFees - financeStats.totalDue).toLocaleString('fr-FR')} CFA</span>
                        </div>
                        <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                            <span className="text-[10px] uppercase font-bold text-destructive block mb-1">Solde Dû</span>
                            <span className="text-sm font-bold text-destructive">{(financeStats.totalDue).toLocaleString('fr-FR')} CFA</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full shadow-glow font-bold" asChild>
                        <Link href="/dashboard/paiements">
                            <Wallet className="mr-2 h-4 w-4" />
                            Gérer les Paiements
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
