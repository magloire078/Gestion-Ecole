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
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency-utils';
import { BillingService } from '@/services/billing-service';
import { Download, CreditCard, Receipt as ReceiptIcon, FileText, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type student as Student, type payment as Payment } from '@/lib/data-types';

interface ParentPaymentsTabProps {
    student: Student & { id: string };
}

export function ParentPaymentsTab({ student }: ParentPaymentsTabProps) {
    const { schoolId, schoolData } = useSchoolData();
    const firestore = useFirestore();

    const paymentsQuery = useMemo(() => {
        if (!schoolId || !student?.id) return null;
        return query(collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/paiements`), orderBy('date', 'desc'));
    }, [firestore, schoolId, student?.id]);

    const { data: paymentHistoryData, loading: paymentsLoading } = useCollection(paymentsQuery);
    const paymentHistory: (Payment & { id: string })[] = useMemo(() => paymentHistoryData?.map(d => ({ id: d.id, ...d.data() } as Payment & { id: string })) || [], [paymentHistoryData]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 relative overflow-hidden border-none shadow-xl bg-slate-900 text-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-blue-600/10 to-transparent z-0" />
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="flex items-center gap-2 text-white/90">
                            <Wallet className="h-5 w-5" />
                            <span>Récapitulatif de Scolarité</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Scolarité</p>
                                <p className="text-lg font-black">{formatCurrency(student.tuitionFee)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Remise</p>
                                <p className="text-lg font-black text-emerald-400">-{formatCurrency(student.discountAmount)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-blue-400 uppercase font-bold tracking-wider">Total Payé</p>
                                <p className="text-lg font-black text-blue-400">{formatCurrency((student.tuitionFee || 0) - (student.amountDue || 0))}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Statut</p>
                                <TuitionStatusBadge status={student.tuitionStatus ?? 'Partiel'} />
                            </div>
                        </div>

                        <Separator className="bg-white/10" />

                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-sm text-white/60 mb-1">Reste à payer</p>
                                <p className="text-5xl font-black tracking-tighter text-white">
                                    {formatCurrency(student.amountDue)}
                                </p>
                            </div>
                            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-black px-8 rounded-2xl shadow-2xl shadow-blue-500/20" disabled={!student.amountDue || student.amountDue <= 0}>
                                <Link href={`/dashboard/parent/student/details/paiement?id=${student.id}`}>
                                    <CreditCard className="mr-2 h-5 w-5" />
                                    Payer en ligne
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-dashed bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Note aux parents
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Tous les paiements effectués en ligne sont instantanément crédités sur le compte de l&apos;élève. 
                            Vous pouvez télécharger vos reçus officiels directement depuis l&apos;historique ci-dessous.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Paiements sécurisés
                        </div>
                    </CardFooter>
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle>Historique des Paiements</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-[180px] uppercase text-[10px] font-black tracking-widest">Date</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest">Détails</TableHead>
                                <TableHead className="text-right uppercase text-[10px] font-black tracking-widest">Montant</TableHead>
                                <TableHead className="text-right uppercase text-[10px] font-black tracking-widest">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paymentsLoading ? (
                                <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                            ) : paymentHistory.length > 0 ? (
                                paymentHistory.map(payment => (
                                    <TableRow key={payment.id} className="group hover:bg-slate-50 transition-colors">
                                        <TableCell className="font-medium">
                                            {format(new Date(payment.date), 'd MMMM yyyy', { locale: fr })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{payment.description}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{payment.method}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-slate-900">
                                            {formatCurrency(payment.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl border-slate-200"
                                                onClick={() => {
                                                    BillingService.generateReceiptPDF(schoolData as any, student, payment, schoolData?.mainLogoUrl);
                                                }}
                                            >
                                                <Download className="mr-2 h-3 w-3" /> Reçu PDF
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground italic">Aucun paiement enregistré.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
