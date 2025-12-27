
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, PlusCircle, MoreHorizontal, CalendarDays } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, query } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { Combobox } from "@/components/ui/combobox";
import { schoolClasses } from '@/lib/data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { fee as Fee } from "@/lib/data-types";
import { useMemo, useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";


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
        return 'kindergarten classroom';
    }
    if (lowerCaseGrade.includes('primaire') || lowerCaseGrade.includes('collège') || lowerCaseGrade.includes('cp') || lowerCaseGrade.includes('ce') || lowerCaseGrade.includes('cm') ) {
        return 'primary school students';
    }
    if (lowerCaseGrade.includes('lycée') || lowerCaseGrade.includes('secondaire') || lowerCaseGrade.includes('seconde') || lowerCaseGrade.includes('première') || lowerCaseGrade.includes('terminale')) {
        return 'high school classroom';
    }
     if (lowerCaseGrade.includes('bts') || lowerCaseGrade.includes('licence') || lowerCaseGrade.includes('supérieur')) {
        return 'university students';
    }
    return 'school students';
};


export default function FeesPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();
  const { toast } = useToast();
  const { user } = useUser();
  const canManageBilling = !!user?.profile?.permissions?.manageBilling;
  
  const feesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`)) : null, [firestore, schoolId]);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const fees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);

  const [isFeeGridDialogOpen, setIsFeeGridDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [isDeleteFeeGridDialogOpen, setIsDeleteFeeGridDialogOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
 
  const feeForm = useForm<FeeFormValues>({
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
        feeForm.reset({
            grade: editingFee.grade,
            amount: editingFee.amount,
            installments: editingFee.installments,
            details: editingFee.details || '',
        });
    } else {
        feeForm.reset({
            grade: '',
            amount: '',
            installments: '',
            details: '',
        });
    }
  }, [isFeeGridDialogOpen, editingFee, feeForm]);

  const getFeeDocRef = (feeId: string) => doc(firestore, `ecoles/${schoolId}/frais_scolarite/${feeId}`);

  const onFeeFormSubmit = (values: FeeFormValues) => {
    if (!schoolId) {
        toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
        return;
    }
    
    // Check for duplicates
    const isDuplicate = fees.some(fee => 
        fee.grade.toLowerCase() === values.grade.toLowerCase() && 
        (!editingFee || fee.id !== editingFee.id)
    );

    if (isDuplicate) {
        feeForm.setError("grade", {
            type: "manual",
            message: "Une grille tarifaire existe déjà pour ce niveau.",
        });
        return;
    }

    const feeData = {
        schoolId,
        grade: values.grade,
        amount: values.amount,
        installments: values.installments,
        details: values.details || "",
    };

    if (editingFee) {
        // Update existing fee
        const feeDocRef = getFeeDocRef(editingFee.id!);
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
    if (!schoolId || !feeToDelete || !feeToDelete.id) return;
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

  const handleCreateGrade = (newGrade: string) => {
    feeForm.setValue('grade', newGrade);
    toast({ title: 'Niveau utilisé', description: `Vous utilisez le nouveau niveau "${newGrade}".` });
    return Promise.resolve({ value: newGrade, label: newGrade });
  };

  const isLoading = schoolDataLoading || feesLoading;

  const gradeOptions = useMemo(() => schoolClasses.map(c => ({ value: c.name, label: c.name })), []);

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9]/g, '')) : value;
    if (isNaN(num)) return value.toString();
    return `${num.toLocaleString('fr-FR')} CFA`;
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Frais de Scolarité</h1>
          <p className="text-muted-foreground">Consultez et gérez les grilles tarifaires de votre établissement.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Grille Tarifaire</h2>
              {canManageBilling && (
                <Button onClick={() => handleOpenFeeGridDialog(null)}>
                  <span className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" /> Ajouter une Grille
                  </span>
                </Button>
              )}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
              ) : (
                  fees.map((fee: Fee) => (
                      <Card key={fee.id} className="flex flex-col overflow-hidden">
                          <CardHeader className="p-0 relative">
                              <SafeImage
                                  src={`https://picsum.photos/seed/${fee.id}/400/200`}
                                  alt={`Image pour ${fee.grade}`}
                                  width={400}
                                  height={200}
                                  className="h-28 w-full object-cover"
                                  data-ai-hint={getImageHintForGrade(fee.grade)}
                              />
                               {canManageBilling && (
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
                              )}
                          </CardHeader>
                          <CardContent className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                  <CardTitle className="text-xl">{fee.grade}</CardTitle>
                                  <div className="flex items-baseline gap-2 mt-2">
                                      <p className="text-3xl font-bold text-primary">{formatCurrency(fee.amount)}</p>
                                      <p className="text-sm text-muted-foreground">/ an</p>
                                  </div>
                              </div>
                               <div className="space-y-2 mt-4">
                                  <CardDescription className="flex items-center gap-2 text-sm">
                                      <CalendarDays className="h-4 w-4 shrink-0" />
                                      <span>{fee.installments}</span>
                                  </CardDescription>
                                  {fee.details && (
                                    <CardDescription className="flex items-start gap-2 text-xs pt-1">
                                        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span className="italic">{fee.details}</span>
                                    </CardDescription>
                                  )}
                               </div>
                          </CardContent>
                      </Card>
                  ))
              )}
          </div>
            { !isLoading && fees.length === 0 && (
                <Card className="flex items-center justify-center h-48">
                    <p className="text-muted-foreground">Aucune grille tarifaire définie. Cliquez sur "Ajouter une Grille" pour commencer.</p>
                </Card>
            )}
        </div>
      </div>
      
      {/* Fee Grid Dialog (Add/Edit) */}
      <Dialog open={isFeeGridDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingFee(null); setIsFeeGridDialogOpen(isOpen); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingFee ? 'Modifier la' : 'Nouvelle'} Grille Tarifaire</DialogTitle>
                <DialogDescription>Entrez les détails de la grille.</DialogDescription>
            </DialogHeader>
            <Form {...feeForm}>
                <form onSubmit={feeForm.handleSubmit(onFeeFormSubmit)} className="grid gap-4 py-4">
                    <FormField
                      control={feeForm.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                          <FormLabel className="text-right">Niveau</FormLabel>
                           <FormControl className="col-span-3">
                               <Combobox
                                    placeholder="Sélectionner ou créer"
                                    searchPlaceholder="Chercher un niveau..."
                                    options={gradeOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onCreate={handleCreateGrade}
                                />
                           </FormControl>
                          <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={feeForm.control}
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
                      control={feeForm.control}
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
                      control={feeForm.control}
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
                        <Button type="submit" disabled={feeForm.formState.isSubmitting}>
                          {feeForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
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
