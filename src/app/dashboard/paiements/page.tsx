
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { student as Student, class_type as Class, fee as Fee } from "@/lib/data-types";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { format } from "date-fns";
import { TuitionReceipt, type ReceiptData } from '@/components/tuition-receipt';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

const paymentSchema = z.object({
  paymentDate: z.string().min(1, "La date est requise."),
  paymentDescription: z.string().min(1, "La description est requise."),
  paymentAmount: z.coerce.number().positive("Le montant doit être un nombre positif."),
  payerFirstName: z.string().min(1, "Le prénom du payeur est requis."),
  payerLastName: z.string().min(1, "Le nom de famille du payeur est requis."),
  payerContact: z.string().optional(),
  paymentMethod: z.string().min(1, "Le mode de paiement est requis."),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentsPage() {
  const firestore = useFirestore();
  const { schoolId, schoolName, loading: schoolDataLoading } = useSchoolData();

  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const feesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/frais_scolarite`) : null, [firestore, schoolId]);
  
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  
  const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data(), name: `${d.data().firstName} ${d.data().lastName}` } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);
  const fees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);


  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isManageFeeDialogOpen, setIsManageFeeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  const { toast } = useToast();

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            paymentDate: format(new Date(), 'yyyy-MM-dd'),
            paymentDescription: '',
            paymentAmount: 0,
            payerFirstName: '',
            payerLastName: '',
            payerContact: '',
            paymentMethod: 'Espèces',
        }
    });
  
  useEffect(() => {
    if (selectedStudent && isManageFeeDialogOpen) {
        paymentForm.reset({
            paymentAmount: 0,
            paymentDescription: `Scolarité - ${selectedStudent.firstName} ${selectedStudent.lastName}`,
            paymentDate: format(new Date(), 'yyyy-MM-dd'),
            payerFirstName: selectedStudent.parent1FirstName || '',
            payerLastName: selectedStudent.parent1LastName || '',
            payerContact: selectedStudent.parent1Contact || '',
            paymentMethod: 'Espèces',
        });
    }
  }, [selectedStudent, isManageFeeDialogOpen, paymentForm]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const classMatch = selectedClass === 'all' || student.classId === selectedClass;
      const statusMatch = selectedStatus === 'all' || student.tuitionStatus === selectedStatus;
      return classMatch && statusMatch;
    });
  }, [students, selectedClass, selectedStatus]);

  const totalDue = useMemo(() => {
    return filteredStudents.reduce((acc, student) => {
        const due = student.amountDue || 0;
        return acc + (due > 0 ? due : 0);
    }, 0);
  }, [filteredStudents]);
  
  const handleOpenManageDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsManageFeeDialogOpen(true);
  };
  
  const handleSaveChanges = async (values: PaymentFormValues) => {
    if (!selectedStudent || !schoolId) {
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Étudiant ou école non sélectionné."
        });
        return;
    }

    const amountPaid = values.paymentAmount;
    // Ensure amountDue doesn't go below zero
    const newAmountDue = Math.max(0, (selectedStudent.amountDue || 0) - amountPaid);
    const newStatus: TuitionStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';
    
    const batch = writeBatch(firestore);

    // 1. Update student's tuition info
    const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${selectedStudent.id}`);
    const studentUpdateData = {
      amountDue: newAmountDue,
      tuitionStatus: newStatus
    };
    batch.update(studentRef, studentUpdateData);

    // 2. Create accounting transaction
    const accountingColRef = collection(firestore, `ecoles/${schoolId}/comptabilite`);
    const newTransactionRef = doc(accountingColRef);
    const accountingData = {
        date: values.paymentDate,
        description: values.paymentDescription || `Paiement scolarité pour ${selectedStudent.firstName} ${selectedStudent.lastName}`,
        category: 'Scolarité',
        type: 'Revenu' as 'Revenu' | 'Dépense',
        amount: amountPaid,
    };
    batch.set(newTransactionRef, accountingData);
    
    // 3. Create payment history entry
    const paymentHistoryRef = doc(collection(firestore, `ecoles/${schoolId}/eleves/${selectedStudent.id}/paiements`));
    const paymentHistoryData = {
        date: values.paymentDate,
        amount: amountPaid,
        description: values.paymentDescription,
        accountingTransactionId: newTransactionRef.id,
        payerFirstName: values.payerFirstName,
        payerLastName: values.payerLastName,
        payerContact: values.payerContact,
        method: values.paymentMethod,
    };
    batch.set(paymentHistoryRef, paymentHistoryData);
    
    try {
        await batch.commit();
        
        toast({
            title: "Paiement enregistré",
            description: `Le paiement de ${amountPaid.toLocaleString('fr-FR')} CFA pour ${selectedStudent.firstName} ${selectedStudent.lastName} a été enregistré.`
        });
        
        // Prepare and show receipt
        setReceiptData({
            schoolName: schoolName || 'Votre École',
            studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            studentMatricule: selectedStudent.matricule || 'N/A',
            className: selectedStudent.class,
            date: new Date(values.paymentDate),
            description: values.paymentDescription,
            amountPaid: amountPaid,
            amountDue: newAmountDue,
            payerName: `${values.payerFirstName} ${values.payerLastName}`,
            payerContact: values.payerContact,
            paymentMethod: values.paymentMethod,
        });

        setIsManageFeeDialogOpen(false);
        setIsReceiptDialogOpen(true);
        setSelectedStudent(null);

    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: `BATCH WRITE: student, accounting, payment history`,
            operation: 'write',
            requestResourceData: { studentUpdate: studentUpdateData, accountingEntry: accountingData, paymentHistory: paymentHistoryData },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };


  const isLoading = schoolDataLoading || studentsLoading || classesLoading || feesLoading;


  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9]/g, '')) : value;
    if (isNaN(num)) return value.toString();
    return `${num.toLocaleString('fr-FR')} CFA`;
  };

  const getTuitionAmountForStudent = (student: Student) => {
    const fee = fees.find(f => f.grade === student.class);
    return fee ? parseFloat(fee.amount) : null;
  };


  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Suivi des Paiements</h1>
        <p className="text-muted-foreground">Consultez et gérez le statut des paiements de scolarité des élèves.</p>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-xl font-semibold">Liste des Élèves</h2>
                <p className="text-muted-foreground">
                    Filtrez par classe ou par statut pour affiner les résultats.
                </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="Soldé">Soldé</SelectItem>
                    <SelectItem value="En retard">En retard</SelectItem>
                    <SelectItem value="Partiel">Partiel</SelectItem>
                </SelectContent>
                </Select>
            </div>
        </div>

        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nom de l'Élève</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead className="text-center">Statut du Paiement</TableHead>
                        <TableHead className="text-right">Solde Dû</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                           <TableRow key={i}>
                               <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                               <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                               <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto"/></TableCell>
                               <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                               <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto"/></TableCell>
                           </TableRow>
                        ))
                    ) : filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">
                                <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline text-primary">
                                    {student.firstName} {student.lastName}
                                </Link>
                            </TableCell>
                            <TableCell>{student.class}</TableCell>
                            <TableCell className="text-center">
                                <TuitionStatusBadge 
                                    status={student.tuitionStatus || 'Partiel'} 
                                    amount={getTuitionAmountForStudent(student)}
                                />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {formatCurrency(student.amountDue)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleOpenManageDialog(student)}>
                                <Pencil className="mr-2 h-3 w-3" /> Gérer
                                </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            Aucun élève ne correspond aux filtres sélectionnés.
                        </TableCell>
                        </TableRow>
                    )}
                    <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={3} className="text-right">Total dû (filtré)</TableCell>
                            <TableCell className="text-right font-mono text-lg text-primary">
                                {formatCurrency(totalDue)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
    
     <Dialog open={isManageFeeDialogOpen} onOpenChange={setIsManageFeeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement pour {selectedStudent?.firstName} {selectedStudent?.lastName}</DialogTitle>
            <DialogDescription>
              Le solde actuel est de <strong>{formatCurrency(selectedStudent?.amountDue || 0)}</strong>.
            </DialogDescription>
          </DialogHeader>
            <Form {...paymentForm}>
                <form id="payment-form" onSubmit={paymentForm.handleSubmit(handleSaveChanges)} className="grid gap-4 py-4">
                    <FormField
                        control={paymentForm.control}
                        name="paymentDate"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-4">
                                <FormLabel className="text-right">Date</FormLabel>
                                <FormControl className="col-span-3">
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage className="col-start-2 col-span-3" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={paymentForm.control}
                        name="paymentDescription"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-4">
                                <FormLabel className="text-right">Description</FormLabel>
                                <FormControl className="col-span-3">
                                    <Input placeholder="Ex: Paiement 1ère tranche" {...field} />
                                </FormControl>
                                <FormMessage className="col-start-2 col-span-3" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={paymentForm.control}
                        name="paymentAmount"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-4">
                                <FormLabel className="text-right">Montant Payé</FormLabel>
                                <FormControl className="col-span-3">
                                    <Input type="number" placeholder="Ex: 50000" {...field} />
                                </FormControl>
                                <FormMessage className="col-start-2 col-span-3" />
                            </FormItem>
                        )}
                    />
                     <FormField
                      control={paymentForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                          <FormLabel className="text-right">Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl className="col-span-3">
                              <SelectTrigger>
                                <SelectValue placeholder="Mode de paiement" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Espèces">Espèces</SelectItem>
                              <SelectItem value="Chèque">Chèque</SelectItem>
                              <SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem>
                              <SelectItem value="Paiement Mobile">Paiement Mobile</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                      )}
                    />
                     <div className="grid grid-cols-2 gap-4">
                         <FormField
                            control={paymentForm.control}
                            name="payerFirstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prénom du Payeur</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Prénom" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={paymentForm.control}
                            name="payerLastName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom du Payeur</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nom" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={paymentForm.control}
                        name="payerContact"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contact du Payeur (Optionnel)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Contact du payeur (optionnel)" {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageFeeDialogOpen(false)}>Annuler</Button>
            <Button type="submit" form="payment-form" disabled={paymentForm.formState.isSubmitting}>
                {paymentForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer le Paiement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* --- Receipt Dialog --- */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reçu de Paiement</DialogTitle>
            <DialogDescription>Aperçu du reçu. Vous pouvez l'imprimer.</DialogDescription>
          </DialogHeader>
          {receiptData && <TuitionReceipt receiptData={receiptData} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
