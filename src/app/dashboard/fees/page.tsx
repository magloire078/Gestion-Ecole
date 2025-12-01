'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Student, Fee, Class } from "@/lib/data";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, GraduationCap, FileText, PlusCircle, MoreHorizontal, CalendarDays } from "lucide-react";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Image from "next/image";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { format } from "date-fns";
import { TuitionReceipt, type ReceiptData } from '@/components/tuition-receipt';
import { Combobox } from "@/components/ui/combobox";
import { schoolCycles } from "@/lib/data";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

const feeSchema = z.object({
  grade: z.string().min(1, { message: "Le niveau est requis." }),
  amount: z.string().min(1, { message: "Le montant est requis." }),
  installments: z.string().min(1, { message: "Les modalités de paiement sont requises." }),
  details: z.string().optional(),
});

type FeeFormValues = z.infer<typeof feeSchema>;


const getImageHintForGrade = (grade: string): string => {
    const lowerCaseGrade = grade.toLowerCase();
    if (lowerCaseGrade.includes('maternelle')) {
        return 'kindergarten children';
    }
    if (lowerCaseGrade.includes('primaire') || lowerCaseGrade.includes('collège')) {
        return 'primary school';
    }
    if (lowerCaseGrade.includes('lycée') || lowerCaseGrade.includes('secondaire')) {
        return 'high school';
    }
    return 'school students';
};


export default function FeesPage() {
  const firestore = useFirestore();
  const { schoolId, schoolName, loading: schoolDataLoading } = useSchoolData();

  // --- Firestore Data Hooks ---
  const feesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/frais_scolarite`) : null, [firestore, schoolId]);
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const fees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);
  const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  // Student payment tracking state
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isManageFeeDialogOpen, setIsManageFeeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerContact, setPayerContact] = useState('');

  // --- Receipt State ---
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  // Fee grid management state
  const [isFeeGridDialogOpen, setIsFeeGridDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [isDeleteFeeGridDialogOpen, setIsDeleteFeeGridDialogOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
 

  const { toast } = useToast();
  
    const form = useForm<FeeFormValues>({
        resolver: zodResolver(feeSchema),
        defaultValues: {
            grade: '',
            amount: '',
            installments: '',
            details: '',
        },
    });

  useEffect(() => {
    if (isFeeGridDialogOpen && editingFee) {
        form.reset({
            grade: editingFee.grade,
            amount: editingFee.amount,
            installments: editingFee.installments,
            details: editingFee.details || '',
        });
    } else {
        form.reset({
            grade: '',
            amount: '',
            installments: '',
            details: '',
        });
    }
  }, [isFeeGridDialogOpen, editingFee, form]);
  
  useEffect(() => {
    if (selectedStudent) {
        setPaymentAmount('');
        setPaymentDescription(`Scolarité - ${selectedStudent.name}`);
        setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
        setPayerName(selectedStudent.parent1Name || '');
        setPayerContact(selectedStudent.parent1Contact || '');
    }
  }, [selectedStudent]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const classMatch = selectedClass === 'all' || student.classId === selectedClass;
      const statusMatch = selectedStatus === 'all' || student.tuitionStatus === selectedStatus;
      return classMatch && statusMatch;
    });
  }, [students, selectedClass, selectedStatus]);

  const totalDue = useMemo(() => {
    return filteredStudents.reduce((acc, student) => acc + (student.amountDue || 0), 0);
  }, [filteredStudents]);
  
  // Student payment functions
  const handleOpenManageDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsManageFeeDialogOpen(true);
  };
  
  const handleSaveChanges = async () => {
    if (!selectedStudent || !schoolId || !paymentAmount || !paymentDate || !payerName) {
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Veuillez entrer un montant, une date et le nom du payeur."
        });
        return;
    }

    const amountPaid = parseFloat(paymentAmount);
    if (isNaN(amountPaid) || amountPaid <= 0) {
        toast({
            variant: "destructive",
            title: "Montant invalide",
            description: "Le montant du paiement doit être un nombre positif."
        });
        return;
    }
    
    const newAmountDue = selectedStudent.amountDue - amountPaid;
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
        date: paymentDate,
        description: paymentDescription || `Paiement scolarité pour ${selectedStudent.name}`,
        category: 'Scolarité',
        type: 'Revenu' as 'Revenu' | 'Dépense',
        amount: amountPaid,
    };
    batch.set(newTransactionRef, accountingData);
    
    // 3. Create payment history entry
    const paymentHistoryRef = doc(collection(firestore, `ecoles/${schoolId}/eleves/${selectedStudent.id}/paiements`));
    const paymentHistoryData = {
        date: paymentDate,
        amount: amountPaid,
        description: paymentDescription,
        accountingTransactionId: newTransactionRef.id,
        payerName: payerName,
        payerContact: payerContact,
    };
    batch.set(paymentHistoryRef, paymentHistoryData);
    
    try {
        await batch.commit();
        
        toast({
            title: "Paiement enregistré",
            description: `Le paiement de ${amountPaid.toLocaleString('fr-FR')} CFA pour ${selectedStudent.name} a été enregistré.`
        });
        
        // Prepare and show receipt
        setReceiptData({
            schoolName: schoolName || 'Votre École',
            studentName: selectedStudent.name,
            studentMatricule: selectedStudent.matricule || 'N/A',
            className: selectedStudent.class,
            date: new Date(paymentDate),
            description: paymentDescription,
            amountPaid: amountPaid,
            amountDue: newAmountDue,
            payerName: payerName,
            payerContact: payerContact,
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

  // --- Firestore CRUD for Fee Grid ---
  const getFeeDocRef = (feeId: string) => doc(firestore, `ecoles/${schoolId}/frais_scolarite/${feeId}`);

  const onFeeFormSubmit = (values: FeeFormValues) => {
    if (!schoolId) {
        toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
        return;
    }
    
    const feeData = {
        grade: values.grade,
        amount: values.amount,
        installments: values.installments,
        details: values.details || "",
    };

    if (editingFee) {
        // Update existing fee
        const feeDocRef = getFeeDocRef(editingFee.id);
        setDoc(feeDocRef, feeData, { merge: true })
          .then(() => {
            toast({ title: "Grille tarifaire modifiée", description: `La grille pour ${values.grade} a été mise à jour.` });
            setIsFeeGridDialogOpen(false);
          }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: feeDocRef.path, operation: 'update', requestResourceData: feeData });
            errorEmitter.emit('permission-error', permissionError);
          });
    } else {
        // Add new fee
        const feesCollectionRef = collection(firestore, `ecoles/${schoolId}/frais_scolarite`);
        addDoc(feesCollectionRef, feeData)
          .then(() => {
            toast({ title: "Grille tarifaire ajoutée", description: `La grille pour ${values.grade} a été créée.` });
            setIsFeeGridDialogOpen(false);
          }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: feesCollectionRef.path, operation: 'create', requestResourceData: feeData });
            errorEmitter.emit('permission-error', permissionError);
          });
    }
  };


  const handleOpenFeeGridDialog = (fee: Fee | null) => {
    setEditingFee(fee);
    setIsFeeGridDialogOpen(true);
  };

  const handleOpenDeleteFeeGridDialog = (fee: Fee) => {
    setFeeToDelete(fee);
    setIsDeleteFeeGridDialogOpen(true);
  };

  const handleDeleteFeeGrid = () => {
    if (!schoolId || !feeToDelete) return;
    const feeDocRef = getFeeDocRef(feeToDelete.id);
    deleteDoc(feeDocRef)
      .then(() => {
        toast({ title: "Grille tarifaire supprimée", description: `La grille pour ${feeToDelete.grade} a été supprimée.` });
        setIsDeleteFeeGridDialogOpen(false);
        setFeeToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: feeDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const isLoading = schoolDataLoading || feesLoading || studentsLoading || classesLoading;

  const cycleOptions = schoolCycles.map(cycle => ({ value: cycle.name, label: cycle.name }));

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Scolarité</h1>
        <p className="text-muted-foreground">Consultez les grilles tarifaires et gérez le statut des paiements des élèves.</p>
      </div>

       <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Grille Tarifaire</h2>
             <Button onClick={() => handleOpenFeeGridDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Grille</Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
            ) : (
                fees.map((fee: Fee) => (
                    <Card key={fee.id} className="flex flex-col">
                        <CardHeader className="p-0 relative">
                            <div className="relative h-40 w-full">
                                <Image 
                                    src={`https://picsum.photos/seed/${fee.id}/400/200`} 
                                    alt={fee.grade}
                                    fill
                                    style={{objectFit: 'cover'}}
                                    className="rounded-t-lg"
                                    data-ai-hint={getImageHintForGrade(fee.grade)}
                                />
                            </div>
                            <div className="absolute top-2 right-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenFeeGridDialog(fee)}>Modifier</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteFeeGridDialog(fee)}>Supprimer</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <GraduationCap className="h-5 w-5" />
                                    {fee.grade}
                                </CardTitle>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <p className="text-3xl font-bold text-primary">{fee.amount}</p>
                                    <p className="text-sm text-muted-foreground">/ an</p>
                                </div>
                                <CardDescription className="flex items-center gap-2 mt-2 text-sm font-medium text-primary">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>{fee.installments}</span>
                                </CardDescription>
                                <CardDescription className="flex items-start gap-2 mt-3 text-xs">
                                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{fee.details}</span>
                                </CardDescription>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-xl font-semibold">Suivi des Paiements des Élèves</h2>
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
                               <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto"/></TableCell>
                               <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                               <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto"/></TableCell>
                           </TableRow>
                        ))
                    ) : filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">
                                <Link href={`/dashboard/students/${student.id}`} className="hover:underline text-primary">
                                    {student.name}
                                </Link>
                            </TableCell>
                            <TableCell>{student.class}</TableCell>
                            <TableCell className="text-center">
                                <TuitionStatusBadge status={student.tuitionStatus} />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                            {student.amountDue > 0 ? formatCurrency(student.amountDue) : '-'}
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
            <DialogTitle>Enregistrer un paiement pour {selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              Le solde actuel est de <strong>{formatCurrency(selectedStudent?.amountDue || 0)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-date" className="text-right">
                Date
              </Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-description" className="text-right">
                Description
              </Label>
              <Input
                id="payment-description"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                className="col-span-3"
                placeholder="Ex: Paiement 1ère tranche"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-amount" className="text-right">
                Montant Payé
              </Label>
              <Input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
                placeholder="Ex: 50000"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payer-name" className="text-right">
                Payé par
              </Label>
              <Input
                id="payer-name"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="col-span-3"
                placeholder="Nom de la personne qui paie"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payer-contact" className="text-right">
                Contact
              </Label>
              <Input
                id="payer-contact"
                value={payerContact}
                onChange={(e) => setPayerContact(e.target.value)}
                className="col-span-3"
                placeholder="Contact du payeur (optionnel)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageFeeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveChanges}>Enregistrer le Paiement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Fee Grid Dialog (Add/Edit) */}
      <Dialog open={isFeeGridDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingFee(null); setIsFeeGridDialogOpen(isOpen); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingFee ? 'Modifier la' : 'Nouvelle'} Grille Tarifaire</DialogTitle>
                <DialogDescription>Entrez les détails de la grille.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onFeeFormSubmit)} className="grid gap-4 py-4">
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                          <FormLabel className="text-right">Niveau</FormLabel>
                           <FormControl className="col-span-3">
                               <Combobox
                                    placeholder="Sélectionner ou créer"
                                    searchPlaceholder="Chercher un niveau..."
                                    options={cycleOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                />
                           </FormControl>
                          <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                          <FormLabel className="text-right">Montant (CFA)</FormLabel>
                          <FormControl className="col-span-3">
                            <Input placeholder="Ex: 980000" {...field} />
                           </FormControl>
                          <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                          <FormLabel className="text-right">Tranches</FormLabel>
                           <FormControl className="col-span-3">
                                <Input placeholder="Ex: 10 tranches mensuelles" {...field} />
                           </FormControl>
                          <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="details"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-start gap-4">
                          <FormLabel className="text-right pt-2">Détails</FormLabel>
                           <FormControl className="col-span-3">
                                <Textarea placeholder="Détails supplémentaires (optionnel)..." {...field} />
                           </FormControl>
                        </FormItem>
                      )}
                    />
                     <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsFeeGridDialogOpen(false)}>Annuler</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>


      {/* --- Receipt Dialog --- */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reçu de Paiement</DialogTitle>
            <DialogDescription>Le paiement a été enregistré avec succès. Vous pouvez imprimer ce reçu.</DialogDescription>
          </DialogHeader>
          {receiptData && <TuitionReceipt receiptData={receiptData} />}
        </DialogContent>
      </Dialog>
      
      {/* Delete Fee Grid Confirmation Dialog */}
       <AlertDialog open={isDeleteFeeGridDialogOpen} onOpenChange={setIsDeleteFeeGridDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La grille tarifaire pour <strong>{feeToDelete?.grade}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFeeGrid} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
