
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { TuitionReceipt, type ReceiptData } from '@/components/tuition-receipt';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, doc, orderBy, query, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Sparkles, Tag, Receipt, Loader2 } from 'lucide-react';
import type { student as Student, payment as Payment } from '@/lib/data-types';
import { PaymentForm, type PaymentFormValues } from './payment-form';

interface PaymentHistoryEntry extends Payment {
  id: string;
}

interface PaymentsTabProps {
    student: Student & { id: string };
    schoolId: string;
    onPaymentSuccess: () => void;
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value.toLocaleString('fr-FR')} CFA`;
};

export function PaymentsTab({ student, schoolId, onPaymentSuccess }: PaymentsTabProps) {
    const firestore = useFirestore();
    const { schoolData } = useSchoolData();

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [receiptToView, setReceiptToView] = useState<ReceiptData | null>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);

    const paymentsQuery = useMemo(() => {
        if (!schoolId || !student?.id) return null;
        return query(collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/paiements`), orderBy('date', 'desc'));
    }, [firestore, schoolId, student?.id]);

    const { data: paymentHistoryData, loading: paymentsLoading } = useCollection(paymentsQuery);

    const paymentHistory: PaymentHistoryEntry[] = useMemo(() => paymentHistoryData?.map(d => ({ id: d.id, ...d.data() } as PaymentHistoryEntry)) || [], [paymentHistoryData]);

    const handleViewReceipt = (payment: PaymentHistoryEntry) => {
        if (!student) return;
      
        const totalPaid = (student.tuitionFee ?? 0) - (student.amountDue ?? 0);
        const paymentsAfterCurrent = paymentHistory.filter(p => new Date(p.date) > new Date(payment.date));
        const sumOfPaymentsAfter = paymentsAfterCurrent.reduce((sum, p) => sum + p.amount, 0);
        const totalPaidBeforeThisPayment = totalPaid - sumOfPaymentsAfter - payment.amount;
        const amountDueBeforeThisPayment = (student.tuitionFee ?? 0) - (student.discountAmount || 0) - totalPaidBeforeThisPayment;
      
        const receipt: ReceiptData = {
            schoolName: schoolData?.name || "Votre École",
            studentName: `${student.firstName} ${student.lastName}`,
            studentMatricule: student.matricule || "N/A",
            className: student.class || "N/A",
            date: new Date(payment.date),
            description: payment.description,
            amountPaid: payment.amount,
            amountDue: amountDueBeforeThisPayment - payment.amount,
            payerName: `${payment.payerFirstName} ${payment.payerLastName}`,
            payerContact: payment.payerContact,
            paymentMethod: payment.method,
        };
        setReceiptToView(receipt);
        setIsReceiptOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /><span>Scolarité</span></CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Frais de scolarité:</span><span className="font-semibold">{formatCurrency(student.tuitionFee)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Remise:</span><span className="font-semibold text-emerald-600">{`-${formatCurrency(student.discountAmount)}`}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Payé:</span><span className="font-semibold text-emerald-600">{formatCurrency((student.tuitionFee || 0) - (student.amountDue || 0))}</span></div>
                        <Separator />
                        <div className="flex justify-between items-center font-bold"><span>Total à payer:</span><span>{formatCurrency((student.tuitionFee || 0) - (student.discountAmount || 0))}</span></div>
                        <Separator />
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut:</span><TuitionStatusBadge status={student.tuitionStatus ?? 'Partiel'}/></div>
                        <div className="flex justify-between items-center text-lg"><span className="font-bold">Solde dû:</span><span className="font-bold text-primary">{formatCurrency(student.amountDue)}</span></div>
                        {(student.discountAmount || 0) > 0 && (
                            <Card className="bg-muted/50 p-3 text-xs"><CardDescription className="flex items-start gap-2"><Tag className="h-4 w-4 mt-0.5 shrink-0" /><div><strong>Motif de la remise:</strong><p>{student.discountReason || 'Non spécifié'}</p></div></CardDescription></Card>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => setIsPaymentDialogOpen(true)}>Enregistrer un paiement</Button>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" /><span>Appréciations</span></CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground italic">"{student.feedback || "Aucune appréciation pour le moment."}"</p></CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Historique des Paiements</CardTitle>
                    <CardDescription>Liste de tous les versements de scolarité effectués.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {paymentsLoading ? (
                                <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                            ) : paymentHistory.length > 0 ? (
                                paymentHistory.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.date), 'd MMMM yyyy', {locale: fr})}</TableCell>
                                        <TableCell>{payment.description}</TableCell>
                                        <TableCell>{payment.method}</TableCell>
                                        <TableCell className="text-right font-mono">{payment.amount.toLocaleString('fr-FR')} CFA</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewReceipt(payment)}>
                                                <Receipt className="mr-2 h-3 w-3" /> Reçu
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Aucun paiement enregistré.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
                <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Reçu de Paiement</DialogTitle><DialogDescription>Aperçu du reçu. Vous pouvez l'imprimer.</DialogDescription></DialogHeader>{receiptToView && <TuitionReceipt receiptData={receiptToView} />}</DialogContent>
            </Dialog>

            <PaymentDialog
                isOpen={isPaymentDialogOpen}
                onClose={() => setIsPaymentDialogOpen(false)}
                student={student}
                schoolData={schoolData}
                onSave={() => { setIsPaymentDialogOpen(false); onPaymentSuccess(); }}
            />
        </div>
    );
}


function PaymentDialog({ isOpen, onClose, onSave, student, schoolData }: { isOpen: boolean, onClose: () => void, onSave: () => void, student: Student & { id: string }, schoolData: any }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSaving, setIsSaving] = useState(false);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    
    const [todayDateString, setTodayDateString] = useState('');
    useEffect(() => { setTodayDateString(format(new Date(), 'yyyy-MM-dd')); }, []);

    const initialFormData = useMemo(() => {
        if (student && todayDateString) {
            return {
                paymentAmount: 0,
                paymentDescription: `Scolarité - ${student.firstName} ${student.lastName}`,
                paymentDate: todayDateString,
                payerFirstName: student.parent1FirstName || '',
                payerLastName: student.parent1LastName || '',
                payerContact: student.parent1Contact || '',
                paymentMethod: 'Espèces',
            };
        }
        return {};
    }, [student, todayDateString]);
    
    const handleSaveChanges = async (values: PaymentFormValues) => {
        if (!student || !schoolData?.id || !student.id) return;
        
        setIsSaving(true);
        
        const amountPaid = values.paymentAmount;
        const newAmountDue = Math.max(0, (student.amountDue || 0) - amountPaid);
        const newStatus: "Soldé" | "Partiel" = newAmountDue <= 0 ? 'Soldé' : 'Partiel';
        
        const batch = writeBatch(firestore);

        const studentRef = doc(firestore, `ecoles/${schoolData.id}/eleves/${student.id}`);
        batch.update(studentRef, { amountDue: newAmountDue, tuitionStatus: newStatus });

        const accountingColRef = collection(firestore, `ecoles/${schoolData.id}/comptabilite`);
        const newTransactionRef = doc(accountingColRef);
        batch.set(newTransactionRef, {
            schoolId: schoolData.id, date: values.paymentDate,
            description: values.paymentDescription || `Paiement scolarité pour ${student.firstName} ${student.lastName}`,
            category: 'Scolarité', type: 'Revenu', amount: amountPaid,
            studentId: student.id,
        });
        
        const paymentHistoryRef = doc(collection(firestore, `ecoles/${schoolData.id}/eleves/${student.id}/paiements`));
        batch.set(paymentHistoryRef, {
            schoolId: schoolData.id,
            studentId: student.id,
            date: values.paymentDate, amount: amountPaid, description: values.paymentDescription,
            accountingTransactionId: newTransactionRef.id, payerFirstName: values.payerFirstName,
            payerLastName: values.payerLastName, payerContact: values.payerContact, method: values.paymentMethod,
        });
        
        batch.commit().then(() => {
            toast({ title: "Paiement enregistré" });
            const amountDueBeforePayment = (student.amountDue || 0);
            setReceiptData({
                schoolName: schoolData?.name || "Votre École", studentName: `${student.firstName} ${student.lastName}`,
                studentMatricule: student.matricule || 'N/A', className: student.class || 'N/A',
                date: new Date(values.paymentDate), description: values.paymentDescription,
                amountPaid: amountPaid, amountDue: amountDueBeforePayment - amountPaid, payerName: `${values.payerFirstName} ${values.payerLastName}`,
                payerContact: values.payerContact, paymentMethod: values.paymentMethod,
            });
            setShowReceipt(true); // Show receipt view
        }).catch((serverError) => {
            console.error("Error saving payment:", serverError);
            toast({
                variant: "destructive",
                title: "Erreur d'enregistrement",
                description: "Impossible d'enregistrer le paiement. Vérifiez vos permissions et réessayez.",
            });
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const handleClose = () => {
        if (showReceipt) { // If we were showing a receipt, it means a save happened
            onSave();
        }
        onClose(); // Always call onClose to ensure dialog state is managed by parent
        // Reset state for next time
        setShowReceipt(false);
        setReceiptData(null);
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                {!showReceipt ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Enregistrer un paiement pour {student.firstName}</DialogTitle>
                            <DialogDescription>Le solde actuel est de <strong>{formatCurrency(student?.amountDue || 0)}</strong>.</DialogDescription>
                        </DialogHeader>
                        <PaymentForm 
                            onSubmit={handleSaveChanges} 
                            initialData={initialFormData}
                            isSaving={isSaving}
                            onCancel={onClose}
                        />
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Reçu de Paiement</DialogTitle>
                            <DialogDescription>Aperçu du reçu. Vous pouvez l'imprimer.</DialogDescription>
                        </DialogHeader>
                        {receiptData && <TuitionReceipt receiptData={receiptData} />}
                        <DialogFooter><Button onClick={handleClose}>Fermer</Button></DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
