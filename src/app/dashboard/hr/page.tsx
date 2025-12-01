
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Mail, Phone, BadgeDollarSign, Calendar, FileText, Lock } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { isValid, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import { PayslipTemplate } from '@/components/payroll/payslip-template';
import { useSubscription } from '@/hooks/use-subscription';
import Link from "next/link";
import { getPayslipDetails, type Employe, type PayslipDetails } from '@/app/bulletin-de-paie';
import { useHydrationFix } from "@/hooks/use-hydration-fix";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const staffSchema = z.object({
  name: z.string().min(1, { message: "Le nom est requis." }),
  role: z.string().min(1, { message: "Le rôle est requis." }),
  email: z.string().email({ message: "L'adresse email est invalide." }).optional().or(z.literal('')),
  phone: z.string().optional(),
  salary: z.coerce.number().min(0, { message: 'Le salaire doit être positif.' }),
  hireDate: z.string().min(1, { message: "La date d'embauche est requise." }),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffMember extends Employe {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  salary?: number;
  hireDate: string;
  poste: string;
  matricule: string;
}

function HRContent() {
  const isMounted = useHydrationFix();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  // --- Firestore Data Hooks ---
  const staffQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/personnel`) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staff: StaffMember[] = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as StaffMember)) || [], [staffData]);

  // --- UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
  
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      role: '',
      email: '',
      phone: '',
      salary: 0,
      hireDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    if (isFormOpen) {
      if (editingStaff) {
        form.reset({
          name: editingStaff.name,
          role: editingStaff.role,
          email: editingStaff.email || '',
          phone: editingStaff.phone || '',
          salary: editingStaff.salary || 0,
          hireDate: editingStaff.hireDate ? format(parseISO(editingStaff.hireDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        });
      } else {
        form.reset({
          name: '',
          role: '',
          email: '',
          phone: '',
          salary: 0,
          hireDate: format(new Date(), 'yyyy-MM-dd'),
        });
      }
    }
  }, [isFormOpen, editingStaff, form]);

  const handleSubmit = async (values: StaffFormValues) => {
    if (!schoolId) {
      toast({ variant: 'destructive', title: 'Erreur', description: "ID de l'école non trouvé." });
      return;
    }
    
    const dataToSave = { 
        ...values,
        baseSalary: values.salary,
        poste: values.role,
        matricule: editingStaff?.matricule || `STAFF-${Math.floor(1000 + Math.random() * 9000)}`,
        status: editingStaff?.status || 'Actif',
    };

    try {
        if (editingStaff) {
            const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${editingStaff.id}`);
            await setDoc(staffDocRef, dataToSave, { merge: true });
            toast({ title: "Membre du personnel modifié", description: `Les informations de ${values.name} ont été mises à jour.` });
        } else {
            const staffCollectionRef = collection(firestore, `ecoles/${schoolId}/personnel`);
            await addDoc(staffCollectionRef, dataToSave);
            toast({ title: "Membre du personnel ajouté", description: `${values.name} a été ajouté(e) à la liste du personnel.` });
        }
        setIsFormOpen(false);
        setEditingStaff(null);
    } catch (error) {
        const operation = editingStaff ? 'update' : 'create';
        const path = `ecoles/${schoolId}/personnel/${editingStaff?.id || ''}`;
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
        errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const handleDelete = () => {
    if (!schoolId || !staffToDelete) return;
    const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffToDelete.id}`);
    deleteDoc(staffDocRef)
      .then(() => {
        toast({ title: "Membre du personnel supprimé", description: `${staffToDelete.name} a été retiré(e) de la liste.` });
        setIsDeleteDialogOpen(false);
        setStaffToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: staffDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleGeneratePayslip = async (staffMember: StaffMember) => {
    if (!isMounted) return;

    setIsGeneratingPayslip(true);
    setPayslipDetails(null);
    setIsPayslipOpen(true);
    
    try {
        const payslipDate = new Date().toISOString();
        const details = await getPayslipDetails(staffMember, payslipDate);
        setPayslipDetails(details);
    } catch(e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Erreur de génération",
            description: "Impossible de calculer le bulletin de paie.",
        });
        setIsPayslipOpen(false);
    } finally {
        setIsGeneratingPayslip(false);
    }
  };

  const handleOpenFormDialog = (staffMember: StaffMember | null) => {
    setEditingStaff(staffMember);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const isLoading = schoolLoading || staffLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Ressources Humaines</h1>
              <p className="text-muted-foreground">Gérez le personnel administratif et de service de votre école.</p>
          </div>
            <Button onClick={() => handleOpenFormDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Membre
            </Button>
        </div>
        
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Salaire Mensuel</TableHead>
                            <TableHead>Embauché le</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : staff.length > 0 ? (
                        staff.map((member) => {
                            const fallback = member.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                            return (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={`https://picsum.photos/seed/${member.id}/100`} alt={member.name} data-ai-hint="person face" />
                                                <AvatarFallback>{fallback}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.role}</TableCell>
                                    <TableCell className="font-mono">{member.salary ? `${member.salary.toLocaleString('fr-FR')} CFA` : 'N/A'}</TableCell>
                                    <TableCell>{isValid(parseISO(member.hireDate)) ? format(parseISO(member.hireDate), 'd MMM yyyy', { locale: fr }) : member.hireDate}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" onClick={() => handleGeneratePayslip(member)}>
                                                <FileText className="mr-2 h-3 w-3" /> Bulletin
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenFormDialog(member)}>Modifier</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(member)}>Supprimer</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                Aucun membre du personnel n'a été ajouté pour le moment.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      
       <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingStaff(null); }}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStaff ? "Modifier un Membre" : "Ajouter un Membre du Personnel"}</DialogTitle>
              <DialogDescription>
                {editingStaff ? `Mettez à jour les informations de ${editingStaff.name}.` : "Renseignez les informations du nouveau membre."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Nom</FormLabel>
                      <FormControl className="col-span-3">
                        <Input placeholder="Nom complet" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Rôle/Poste</FormLabel>
                      <FormControl className="col-span-3">
                        <Input placeholder="Ex: Comptable" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Email</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="email" placeholder="email@exemple.com" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Téléphone</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="tel" placeholder="(Optionnel)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Salaire (CFA)</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Date d'embauche</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="date" {...field} />
                      </FormControl>
                       <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le membre du personnel <strong>{staffToDelete?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Bulletin de paie</DialogTitle>
              <DialogDescription>
                Aperçu du bulletin de paie pour {payslipDetails?.employeeInfo.name || "..."}.
              </DialogDescription>
            </DialogHeader>
            {isGeneratingPayslip ? (
                <div className="flex items-center justify-center h-96">
                    <p>Génération du bulletin de paie...</p>
                </div>
            ) : isMounted && payslipDetails ? (
                <div className="mt-4 max-h-[70vh] overflow-y-auto">
                    <PayslipTemplate payslipDetails={payslipDetails} />
                </div>
            ) : (
                 <div className="flex items-center justify-center h-96">
                    <p className="text-red-500">Impossible de charger le bulletin de paie.</p>
                </div>
            )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HRPage() {
    const { subscription, loading: subscriptionLoading } = useSubscription();

    const isLoading = subscriptionLoading;

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-semibold">Chargement...</p>
                </div>
            </div>
        );
    }

    if (subscription?.plan !== 'Pro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="h-6 w-6 text-primary" />
                            Fonctionnalité du Plan Pro
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            La gestion des ressources humaines et de la paie est une fonctionnalité avancée. Pour y accéder, veuillez mettre à niveau votre abonnement.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/settings/subscription">
                                Mettre à niveau vers le Plan Pro
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return <HRContent />;
}
