
'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';
import Link from 'next/link';

interface FinanceOverviewProps {
    schoolId: string;
}

export function FinanceOverview({ schoolId }: FinanceOverviewProps) {
    const firestore = useFirestore();

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        return query(collection(firestore, `ecoles/${schoolId}/eleves`));
    }, [firestore, schoolId]);
    
    const { data: studentsData, loading } = useCollection(studentsQuery);

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
    
    if(loading) {
        return (
            <Card>
                 <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
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
        <Card>
            <CardHeader>
                <CardTitle>Aperçu Financier</CardTitle>
                <CardDescription>État des paiements de scolarité.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Taux de paiement</span>
                        <span className="text-sm font-semibold">{financeStats.paidPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={financeStats.paidPercentage} />
                </div>
                <div className="text-sm">
                    <p className="flex justify-between">
                        <span className="text-muted-foreground">Total Encaissé:</span>
                        <span className="font-medium text-emerald-600">{(financeStats.totalFees - financeStats.totalDue).toLocaleString('fr-FR')} CFA</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-muted-foreground">Solde Dû:</span>
                        <span className="font-medium text-destructive">{financeStats.totalDue.toLocaleString('fr-FR')} CFA</span>
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" asChild>
                    <Link href="/dashboard/paiements">
                        <Wallet className="mr-2 h-4 w-4" />
                        Gérer les Paiements
                    </Link>
                 </Button>
            </CardFooter>
        </Card>
    );
}
