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
import { PlusCircle, Search, Edit2, Trash2, DollarSign, BookOpen, Layers, Settings2, MoreHorizontal, RefreshCcw, CalendarDays, FileText, Loader2 } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency-utils";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { Combobox } from "@/components/ui/combobox";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { fee as Fee, niveau as Niveau, student as Student } from "@/lib/data-types";
import { useMemo, useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { FeesService } from "@/services/fees-service";
import { useFees } from "@/hooks/use-fees";
import { cn } from "@/lib/utils";

const feeSchema = z.object({
  grade: z.string().min(1, { message: "Le niveau est requis." }),
  installments: z.string().min(1, { message: "Les modalités de paiement sont requises." }),
  details: z.string().optional(),
  
  // Tarification Régime Privé (Non-Affecté)
  inscription: z.string().min(1, "Requis").regex(/^\d+$/, "Nombre entier uniquement"),
  scolarite: z.string().min(1, "Requis").regex(/^\d+$/, "Nombre entier uniquement"),
  annexes: z.string().min(1, "Requis").regex(/^\d+$/, "Nombre entier uniquement"),

  // Tarification Régime État (Affecté)
  inscriptionAff: z.string().min(1, "Requis").regex(/^\d+$/, "Nombre entier uniquement"),
  scolariteAff: z.string().min(1, "Requis").regex(/^\d+$/, "Nombre entier uniquement"),
  annexesAff: z.string().min(1, "Requis").regex(/^\d+$/, "Nombre entier uniquement"),
});

type FeeFormValues = z.infer<typeof feeSchema>;

const getGradientForGrade = (grade: string): string => {
  const lowerCaseGrade = grade.toLowerCase();
  if (
    lowerCaseGrade.includes('maternelle') ||
    lowerCaseGrade.includes('section') ||
    lowerCaseGrade.includes('petite') ||
    lowerCaseGrade.includes('moyenne') ||
    lowerCaseGrade.includes('grande')
  ) {
    return 'from-amber-400 to-orange-500';
  }
  if (
    lowerCaseGrade.includes('primaire') ||
    lowerCaseGrade.includes('cp') ||
    lowerCaseGrade.includes('ce') ||
    lowerCaseGrade.includes('cm')
  ) {
    return 'from-emerald-400 to-teal-600';
  }
  if (
    lowerCaseGrade.includes('lycée') ||
    lowerCaseGrade.includes('collège') ||
    lowerCaseGrade.includes('secondaire') ||
    lowerCaseGrade.includes('seconde') ||
    lowerCaseGrade.includes('première') ||
    lowerCaseGrade.includes('terminale') ||
    /^\d+/.test(lowerCaseGrade)
  ) {
    return 'from-blue-500 to-indigo-600';
  }
  if (
    lowerCaseGrade.includes('bts') ||
    lowerCaseGrade.includes('licence') ||
    lowerCaseGrade.includes('supérieur')
  ) {
    return 'from-indigo-600 via-purple-600 to-pink-600';
  }
  return 'from-slate-400 to-slate-600';
};

export default function FeesPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();
  const { toast } = useToast();
  const { user } = useUser();
  const canManageBilling = !!user?.profile?.permissions?.manageBilling || user?.profile?.role === 'directeur' || user?.profile?.isSuperAdmin;

  const { fees, loading: feesLoading } = useFees(schoolId);

  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const niveaux = useMemo(() => niveauxData?.map(doc => doc.data() as Niveau) || [], [niveauxData]);

  const [isFeeGridDialogOpen, setIsFeeGridDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [isDeleteFeeGridDialogOpen, setIsDeleteFeeGridDialogOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [feeToSync, setFeeToSync] = useState<Fee | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const feeForm = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      grade: '',
      installments: '',
      details: '',
      inscription: '0',
      scolarite: '0',
      annexes: '0',
      inscriptionAff: '0',
      scolariteAff: '0',
      annexesAff: '0',
    },
  });

  useEffect(() => {
    if (isFeeGridDialogOpen && editingFee) {
      feeForm.reset({
        grade: editingFee.grade,
        installments: editingFee.installments,
        details: editingFee.details || '',
        inscription: editingFee.inscription || '0',
        scolarite: editingFee.scolarite || editingFee.amount || '0',
        annexes: editingFee.annexes || '0',
        inscriptionAff: editingFee.inscriptionAff || '0',
        scolariteAff: editingFee.scolariteAff || editingFee.amountAff || editingFee.amount || '0',
        annexesAff: editingFee.annexesAff || '0',
      });
    } else {
      feeForm.reset({
        grade: '',
        installments: '',
        details: '',
        inscription: '0',
        scolarite: '0',
        annexes: '0',
        inscriptionAff: '0',
        scolariteAff: '0',
        annexesAff: '0',
      });
    }
  }, [isFeeGridDialogOpen, editingFee, feeForm]);

  const onFeeFormSubmit = async (values: FeeFormValues) => {
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

    // Calculs automatiques
    const totalAmount = (parseInt(values.inscription) + parseInt(values.scolarite) + parseInt(values.annexes)).toString();
    const totalAmountAff = (parseInt(values.inscriptionAff) + parseInt(values.scolariteAff) + parseInt(values.annexesAff)).toString();

    const feeData = {
      schoolId,
      grade: values.grade,
      amount: totalAmount,
      amountAff: totalAmountAff,
      installments: values.installments,
      details: values.details || "",
      inscription: values.inscription,
      scolarite: values.scolarite,
      annexes: values.annexes,
      inscriptionAff: values.inscriptionAff,
      scolariteAff: values.scolariteAff,
      annexesAff: values.annexesAff,
    };

    try {
      if (editingFee) {
        await FeesService.updateFee(schoolId, editingFee.id!, feeData);
      } else {
        await FeesService.createFee(schoolId, feeData);
      }
      toast({ title: `Grille tarifaire ${editingFee ? 'modifiée' : 'ajoutée'}`, description: `La grille pour ${values.grade} a été enregistrée.` });
      setIsFeeGridDialogOpen(false);
    } catch (error) {
      console.error("Error saving fee grid:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la grille tarifaire." });
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

  const handleDeleteFeeGrid = async () => {
    if (!schoolId || !feeToDelete || !feeToDelete.id) return;

    try {
      await FeesService.deleteFee(schoolId, feeToDelete.id);
      toast({ title: "Grille tarifaire supprimée", description: `La grille pour ${feeToDelete.grade} a été supprimée.` });
      setIsDeleteFeeGridDialogOpen(false);
      setFeeToDelete(null);
    } catch (error) {
      console.error("Error deleting fee grid:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la grille tarifaire." });
    }
  };

  const handleSyncWithStudents = async () => {
    if (!schoolId || !feeToSync) return;

    setIsSyncing(true);
    try {
      const studentsQuery = query(
        collection(firestore, `ecoles/${schoolId}/eleves`),
        where('grade', '==', feeToSync.grade),
        where('status', '==', 'Actif')
      );

      const querySnapshot = await getDocs(studentsQuery);
      if (querySnapshot.empty) {
        toast({ title: "Aucun élève", description: `Aucun élève actif trouvé pour le niveau ${feeToSync.grade}.` });
        setIsSyncDialogOpen(false);
        return;
      }

      const batch = writeBatch(firestore);
      const newFeeAmount = parseFloat(feeToSync.amount);
      const newFeeAmountAff = parseFloat(feeToSync.amountAff || feeToSync.amount);

      querySnapshot.forEach((studentDoc) => {
        const studentData = studentDoc.data() as Student;
        const isAff = studentData.statusAff === 'Affecté';
        const expectedFee = isAff ? newFeeAmountAff : newFeeAmount;
        
        const currentTuitionFee = studentData.tuitionFee || 0;
        const currentAmountDue = studentData.amountDue || 0;

        // Calculate difference and update amount due
        const diff = expectedFee - currentTuitionFee;
        const newAmountDue = Math.max(0, currentAmountDue + diff);
        const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';

        batch.update(studentDoc.ref, {
          tuitionFee: expectedFee,
          amountDue: newAmountDue,
          tuitionStatus: newStatus,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      toast({ title: "Synchronisation réussie", description: `${querySnapshot.size} élèves ont été mis à jour.` });
      setIsSyncDialogOpen(false);
    } catch (error) {
      console.error("Error syncing fees:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue lors de la synchronisation." });
    } finally {
      setIsSyncing(false);
      setFeeToSync(null);
    }
  };

  const handleCreateGrade = (newGrade: string) => {
    feeForm.setValue('grade', newGrade);
    toast({ title: 'Niveau utilisé', description: `Vous utilisez le nouveau niveau "${newGrade}".` });
    return Promise.resolve({ value: newGrade, label: newGrade });
  };

  const isLoading = schoolDataLoading || feesLoading || niveauxLoading;

  const gradeOptions = useMemo(() => {
    const uniqueGradeNames = [...new Set(niveaux.map(n => n.name).filter(Boolean))];
    uniqueGradeNames.sort((a, b) => a.localeCompare(b));
    return uniqueGradeNames.map(name => ({ value: name, label: name }));
  }, [niveaux]);

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Frais de Scolarité</h1>
          <p className="text-muted-foreground text-sm font-medium">Consultez et gérez les grilles tarifaires de votre établissement.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-700">Grille Tarifaire</h2>
            {canManageBilling && (
              <Button onClick={() => handleOpenFeeGridDialog(null)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95">
                <PlusCircle className="h-4 w-4" /> Ajouter une Grille
              </Button>
            )}
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl animate-pulse" />)
            ) : (
              fees.map((fee: Fee) => (
                <Card key={fee.id} className="flex flex-col overflow-hidden rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md">
                  <CardHeader className="p-0 relative">
                    <div className={cn(
                      "h-24 w-full bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
                      getGradientForGrade(fee.grade)
                    )}>
                      <span className="text-white/15 font-black text-5xl tracking-tighter select-none font-outfit uppercase">
                        {fee.grade.substring(0, 3)}
                      </span>
                    </div>
                    {canManageBilling && (
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl bg-white">
                            <DropdownMenuItem onClick={() => handleOpenFeeGridDialog(fee)}>Modifier</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setFeeToSync(fee); setIsSyncDialogOpen(true); }}>
                              <RefreshCcw className="mr-2 h-4 w-4" /> Appliquer aux élèves
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-600" onClick={() => handleOpenDeleteFeeGridDialog(fee)}>Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <CardTitle className="text-lg font-black text-slate-800 tracking-tight">{fee.grade}</CardTitle>
                      
                      {/* Grille double tarifs */}
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100/60">
                        {/* Régime Privé */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Régime Privé</p>
                          <p className="text-lg font-black text-indigo-600 font-mono">{formatCurrency(Number(fee.amount))}</p>
                          <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                            <p>Inscr: {formatCurrency(Number(fee.inscription || 0))}</p>
                            <p>Scol: {formatCurrency(Number(fee.scolarite || fee.amount))}</p>
                            <p>Annexe: {formatCurrency(Number(fee.annexes || 0))}</p>
                          </div>
                        </div>

                        {/* Régime Affecté */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Régime Affecté</p>
                          <p className="text-lg font-black text-emerald-600 font-mono">{formatCurrency(Number(fee.amountAff || fee.amount))}</p>
                          <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                            <p>Inscr: {formatCurrency(Number(fee.inscriptionAff || 0))}</p>
                            <p>Scol: {formatCurrency(Number(fee.scolariteAff || fee.amount))}</p>
                            <p>Annexe: {formatCurrency(Number(fee.annexesAff || 0))}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100/60">
                      <CardDescription className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{fee.installments}</span>
                      </CardDescription>
                      {fee.details && (
                        <CardDescription className="flex items-start gap-2 text-[10px] pt-1">
                          <FileText className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                          <span className="italic text-slate-500">{fee.details}</span>
                        </CardDescription>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          {!isLoading && fees.length === 0 && (
            <Card className="flex items-center justify-center h-48 rounded-2xl bg-white/40 border-dashed border-2">
              <p className="text-slate-500 text-sm font-medium">Aucune grille tarifaire définie. Cliquez sur &quot;Ajouter une Grille&quot; pour commencer.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Fee Grid Dialog (Add/Edit) */}
      <Dialog open={isFeeGridDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingFee(null); setIsFeeGridDialogOpen(isOpen); }}>
        <DialogContent className="max-w-3xl w-full p-6 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
              {editingFee ? 'Modifier la' : 'Nouvelle'} Grille Tarifaire
            </DialogTitle>
            <DialogDescription>
              Définissez la ventilation des frais par régime d&apos;inscription.
            </DialogDescription>
          </DialogHeader>
          <Form {...feeForm}>
            <form onSubmit={feeForm.handleSubmit(onFeeFormSubmit)} className="space-y-6">
              
              {/* Informations Générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={feeForm.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Niveau Scolaire *</FormLabel>
                      <FormControl>
                        <Combobox
                          placeholder="Sélectionner ou créer"
                          searchPlaceholder="Chercher un niveau..."
                          options={gradeOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          onCreate={handleCreateGrade}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={feeForm.control}
                  name="installments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Modalités Tranches *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 3 tranches (Acompte, Dec, Fev)" className="rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Grid Double Tarification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-4">
                
                {/* Régime Privé (Non-Affecté) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 border-b pb-1">
                    Tarif Régime Privé (Non-Affecté)
                  </h4>
                  
                  <FormField
                    control={feeForm.control}
                    name="inscription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frais d&apos;Inscription (F)</FormLabel>
                        <FormControl><Input type="number" min="0" className="rounded-xl font-mono" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={feeForm.control}
                    name="scolarite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frais de Scolarité (F)</FormLabel>
                        <FormControl><Input type="number" min="0" className="rounded-xl font-mono" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={feeForm.control}
                    name="annexes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frais Annexes (F)</FormLabel>
                        <FormControl><Input type="number" min="0" className="rounded-xl font-mono" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Régime État (Affecté) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 border-b pb-1">
                    Tarif Régime État (Affecté)
                  </h4>
                  
                  <FormField
                    control={feeForm.control}
                    name="inscriptionAff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frais d&apos;Inscription (F)</FormLabel>
                        <FormControl><Input type="number" min="0" className="rounded-xl font-mono" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={feeForm.control}
                    name="scolariteAff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frais de Scolarité (F)</FormLabel>
                        <FormControl><Input type="number" min="0" className="rounded-xl font-mono" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={feeForm.control}
                    name="annexesAff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frais Annexes (F)</FormLabel>
                        <FormControl><Input type="number" min="0" className="rounded-xl font-mono" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              </div>

              {/* Détails */}
              <FormField
                control={feeForm.control}
                name="details"
                render={({ field }) => (
                  <FormItem className="border-t pt-4">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Notes / Informations Additionnelles</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Précisions de paiement (optionnel)..." className="rounded-xl" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFeeGridDialogOpen(false)} className="rounded-xl">Annuler</Button>
                <Button type="submit" disabled={feeForm.formState.isSubmitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all hover:scale-105 active:scale-95">
                  {feeForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer la Grille'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sync Confirmation Dialog */}
      <AlertDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-white border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900 tracking-tight">Mettre à jour les dossiers élèves ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va mettre à jour la tarification de **tous les élèves actifs** du niveau **{feeToSync?.grade}** pour l&apos;année courante.
              Les montants dus seront recalculés en séparant les élèves **Affectés** (tarif État: {formatCurrency(Number(feeToSync?.amountAff || feeToSync?.amount || 0))}) des élèves **Non-Affectés** (tarif Privé: {formatCurrency(Number(feeToSync?.amount || 0))}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing} className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncWithStudents} disabled={isSyncing} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Lancer la mise à jour
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Fee Grid Confirmation Dialog */}
      <AlertDialog open={isDeleteFeeGridDialogOpen} onOpenChange={setIsDeleteFeeGridDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-white border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900 tracking-tight">Supprimer définitivement la grille ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La grille de tarification pour le niveau <strong>{feeToDelete?.grade}</strong> sera supprimée de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFeeGrid} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
