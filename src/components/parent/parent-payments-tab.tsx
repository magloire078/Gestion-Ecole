'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { useCollection, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Wallet } from 'lucide-react';
import type { student as Student, payment as Payment } from '@/lib/data-types';

interface ParentPaymentsTabProps {
    student: Student & { id: string };
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value.toLocaleString('fr-FR')} CFA`;
};

export function ParentPaymentsTab({ student }: ParentPaymentsTabProps) {
    const { schoolId } = useSchoolData();
    const firestore = useFirestore();

    const paymentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/paiements`), orderBy('date', 'desc')) : null, [firestore, schoolId, student.id]);
    const { data: paymentHistoryData, loading: paymentsLoading } = useCollection(paymentsQuery);
    const paymentHistory: (Payment & {id:string})[] = useMemo(() => paymentHistoryData?.map(d => ({ id: d.id, ...d.data() } as Payment & {id:string})) || [], [paymentHistoryData]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /><span>Scolarité</span></CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Frais de scolarité:</span><span className="font-semibold">{formatCurrency(student.tuitionFee)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Remise:</span><span className="font-semibold text-emerald-600">{`-${formatCurrency(student.discountAmount)}`}</span></div>
                    <Separator />
                    <div className="flex justify-between items-center font-bold"><span>Total à payer:</span><span>{formatCurrency((student.tuitionFee || 0) - (student.discountAmount || 0))}</span></div>
                    <Separator />
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut:</span><TuitionStatusBadge status={student.tuitionStatus ?? 'Partiel'}/></div>
                    <div className="flex justify-between items-center text-lg"><span className="font-bold">Solde dû:</span><span className="font-bold text-primary">{formatCurrency(student.amountDue)}</span></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Historique des Paiements</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {paymentsLoading ? (
                                <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                            ) : paymentHistory.length > 0 ? (
                                paymentHistory.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.date), 'd MMMM yyyy', {locale: fr})}</TableCell>
                                        <TableCell>{payment.description}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(payment.amount)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">Aucun paiement enregistré.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
