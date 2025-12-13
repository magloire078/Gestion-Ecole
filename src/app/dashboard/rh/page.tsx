

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, FileText, BookUser, Mail, Phone } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
import { useCollection, useFirestore, useAuth } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, writeBatch, query, where, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { isValid, parseISO, format } from "date-fns";
import { getPayslipDetails, type PayslipDetails } from '@/app/bulletin-de-paie';
import type { staff as Staff, school as OrganizationSettings } from '@/lib/data-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PayslipPreview } from '@/components/payroll/payslip-template';
import { allSubjects } from '@/lib/data';
import type { class_type as Class } from '@/lib/data-types';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useHydrationFix } from "@/hooks/use-hydration-fix";


const staffSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  role: z.string().min(1, { message: "Le rôle est requis." }),
  email: z.string().email({ message: "L'adresse email est invalide." }),
  phone: z.string().optional(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").optional(),
  baseSalary: z.coerce.number().min(0, { message: 'Le salaire doit être positif.' }),
  hireDate: z.string().min(1, { message: "La date d'embauche est requise." }),
  // --- Teacher-specific fields ---
  subject: z.string().optional(),
  classId: z.string().optional(),
  // --- Payroll fields ---
  situationMatrimoniale: z.string().optional(),
  enfants: z.coerce.number().min(0).optional(),
  categorie: z.string().optional(),
  cnpsEmploye: z.string().optional(),
  CNPS: z.boolean().default(false),
  indemniteTransportImposable: z.coerce.number().min(0).optional(),
  indemniteResponsabilite: z.coerce.number().min(0).optional(),
  indemniteLogement: z.coerce.number().min(0).optional(),
  indemniteSujetion: z.coerce.number().min(0).optional(),
  indemniteCommunication: z.coerce.number().min(0).optional(),
  indemniteRepresentation: z.coerce.number().min(0).optional(),
  transportNonImposable: z.coerce.number().min(0).optional(),
  banque: z.string().optional(),
  CB: z.string().optional(),
  CG: z.string().optional(),
  numeroCompte: z.string().optional(),
  Cle_RIB: z.string().optional(),
}).refine(data => data.role !== 'enseignant' || (data.role === 'enseignant' && data.subject), {
  message: "La matière principale est requise pour un enseignant.",
  path: ["subject"],
});

type StaffFormValues = z.infer<typeof staffSchema>;
type StaffMember = Staff & { id: string };

export default function HRPage() {
  const isMounted = useHydrationFix();
  const firestore = useFirestore();
  const auth = useAuth();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  
  const { teachers, otherStaff } = useMemo(() => {
    const allStaff: StaffMember[] = staffData?.map(d => ({ id: d.id, ...d.data() } as StaffMember)) || [];
    return {
        teachers: allStaff.filter(s => s.role === 'enseignant'),
        otherStaff: allStaff.filter(s => s.role !== 'enseignant'),
    }
  }, [staffData]);

  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
  const [todayDateString, setTodayDateString] = useState('');

  useEffect(() => {
    setTodayDateString(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: '', lastName: '', role: '', email: '', phone: '', password: '', baseSalary: 0, hireDate: '', subject: '', classId: '', situationMatrimoniale: 'Célibataire', enfants: 0, categorie: '', cnpsEmploye: '', CNPS: true, indemniteTransportImposable: 0, indemniteResponsabilite: 0, indemniteLogement: 0, indemniteSujetion: 0, indemniteCommunication: 0, indemniteRepresentation: 0, transportNonImposable: 0, banque: '', CB: '', CG: '', numeroCompte: '', Cle_RIB: '',
    },
  });

  useEffect(() => {
    if (todayDateString && !form.getValues('hireDate')) {
      form.reset({ ...form.getValues(), hireDate: todayDateString });
    }
  }, [todayDateString, form]);

  const watchedRole = form.watch('role');

  useEffect(() => {
    async function loadPrivateData() {
        if (isFormOpen && editingStaff && schoolId) {
            const staffRef = doc(firestore, `ecoles/${schoolId}/personnel/${editingStaff.id}`);
            const docSnap = await getDoc(staffRef);
            const fullData = docSnap.exists() ? docSnap.data() as Staff : {};
            form.reset({
                ...editingStaff,
                ...fullData,
                password: '',
                baseSalary: fullData.baseSalary || 0,
                hireDate: editingStaff.hireDate && isValid(parseISO(editingStaff.hireDate)) ? format(parseISO(editingStaff.hireDate), 'yyyy-MM-dd') : todayDateString,
            });
        } else if (isFormOpen) {
            form.reset({
                firstName: '', lastName: '', role: '', email: '', phone: '', password: '', baseSalary: 0, hireDate: todayDateString, subject: '', classId: '', situationMatrimoniale: 'Célibataire', enfants: 0, categorie: '', cnpsEmploye: '', CNPS: true, indemniteTransportImposable: 0, indemniteResponsabilite: 0, indemniteLogement: 0, indemniteSujetion: 0, indemniteCommunication: 0, indemniteRepresentation: 0, transportNonImposable: 0, banque: '', CB: '', CG: '', numeroCompte: '', Cle_RIB: '',
            });
        }
    }
    loadPrivateData();
  }, [isFormOpen, editingStaff, schoolId, firestore, form, todayDateString]);

  const handleSubmit = async (values: StaffFormValues) => {
    if (!schoolId) {
      toast({ variant: 'destructive', title: 'Erreur', description: "ID de l'école non trouvé." });
      return;
    }
    
    const { password, ...dataToSave } = {
        ...values,
        schoolId,
        matricule: editingStaff?.matricule || `STAFF-${Math.floor(1000 + Math.random() * 9000)}`,
        status: editingStaff?.status || 'Actif',
    };

    try {
        if (editingStaff) {
            const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${editingStaff.id}`);
            await setDoc(staffDocRef, dataToSave, { merge: true });
            toast({ title: "Membre du personnel modifié", description: `Les informations de ${values.firstName} ${values.lastName} ont été mises à jour.` });
        } else {
            if (!password) {
                 form.setError("password", { type: "manual", message: "Le mot de passe est requis pour un nouvel utilisateur." });
                 return;
            }
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, password);
            const newUid = userCredential.user.uid;
            
            const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${newUid}`);
            await setDoc(staffDocRef, { ...dataToSave, uid: newUid });

            const userRootRef = doc(firestore, `utilisateurs/${newUid}`);
            await setDoc(userRootRef, { schoolId });

            toast({ title: "Membre du personnel ajouté", description: `${values.firstName} ${values.lastName} a été ajouté(e) et peut maintenant se connecter.` });
        }
        setIsFormOpen(false);
        setEditingStaff(null);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            form.setError("email", { type: "manual", message: "Cette adresse e-mail est déjà utilisée." });
        } else {
            const operation = editingStaff ? 'update' : 'create';
            const path = `ecoles/${schoolId}/personnel/${editingStaff?.id || ''}`;
            const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
            errorEmitter.emit('permission-error', permissionError);
        }
    }
  };
  
  const handleDelete = () => {
    if (!schoolId || !staffToDelete) return;
    const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffToDelete.id}`);
    deleteDoc(staffDocRef)
      .then(() => {
        toast({ title: "Membre du personnel supprimé", description: `${staffToDelete.firstName} ${staffToDelete.lastName} a été retiré(e) de la liste.` });
        setIsDeleteDialogOpen(false);
        setStaffToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: staffDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleGeneratePayslip = async (staffMember: StaffMember) => {
    if (!schoolData || !schoolId) return;

    setIsGeneratingPayslip(true);
    setPayslipDetails(null);
    setIsPayslipOpen(true);
    
    try {
        const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffMember.id}`);
        const staffDocSnap = await getDoc(staffDocRef);
        const fullStaffData = staffDocSnap.exists() ? staffDocSnap.data() as Staff : staffMember;

        const payslipDate = new Date().toISOString();
        const details = await getPayslipDetails(fullStaffData, payslipDate, schoolData as OrganizationSettings);
        setPayslipDetails(details);
    } catch(e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Erreur de génération",
            description: "Impossible de calculer le bulletin de paie. Vérifiez que toutes les données de paie sont renseignées.",
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

  const isLoading = schoolLoading || staffLoading || classesLoading;

  const renderStaffCard = (member: StaffMember) => {
    const fullName = `${member.firstName} ${member.lastName}`;
    const fallback = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
    const className = classes.find(c => c.id === member.classId)?.name;

    return (
        <Card key={member.id} className="flex flex-col">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={member.photoURL || `https://picsum.photos/seed/${member.id}/100`} alt={fullName} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{fullName}</CardTitle>
                            <CardDescription className="capitalize">{member.role === 'enseignant' ? member.subject : member.role}</CardDescription>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}>
                            <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenFormDialog(member)}>Modifier</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGeneratePayslip(member)}>Générer Bulletin de Paie</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(member)}>Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    <a href={`mailto:${member.email}`} className="truncate hover:underline">{member.email}</a>
                </div>
                {member.phone && (
                    <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4" />
                        <a href={`tel:${member.phone}`} className="truncate hover:underline">{member.phone}</a>
                    </div>
                )}
                {className && (
                     <div className="flex items-center">
                        <BookUser className="mr-2 h-4 w-4" />
                        <span>Classe principale: <strong>{className}</strong></span>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button variant="outline" size="sm" className="w-full" onClick={() => handleGeneratePayslip(member)}>
                    <span className="flex items-center gap-2">
                        <FileText className="h-3 w-3" /> Voir le dernier bulletin
                    </span>
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Ressources Humaines</h1>
              <p className="text-muted-foreground">Gérez le personnel (enseignant et non-enseignant) de votre école.</p>
          </div>
            <Button onClick={() => handleOpenFormDialog(null)}>
              <span className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" /> Ajouter un Membre
              </span>
            </Button>
        </div>
        
        <Tabs defaultValue="teachers">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teachers">Enseignants ({teachers.length})</TabsTrigger>
                <TabsTrigger value="staff">Autre Personnel ({otherStaff.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="teachers" className="mt-6">
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : teachers.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {teachers.map(renderStaffCard)}
                    </div>
                ) : (
                    <Card className="flex items-center justify-center h-48">
                        <p className="text-muted-foreground">Aucun enseignant n'a été ajouté pour le moment.</p>
                    </Card>
                )}
            </TabsContent>
             <TabsContent value="staff" className="mt-6">
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : otherStaff.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {otherStaff.map(renderStaffCard)}
                    </div>
                ) : (
                    <Card className="flex items-center justify-center h-48">
                        <p className="text-muted-foreground">Aucun autre membre du personnel n'a été ajouté.</p>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le membre du personnel <strong>{staffToDelete?.firstName} {staffToDelete?.lastName}</strong> sera définitivement supprimé. Son compte utilisateur ne sera pas supprimé mais il n'aura plus accès à l'école.
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
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Bulletin de paie</DialogTitle>
              <DialogDescription>
                Aperçu du bulletin de paie pour {payslipDetails?.employeeInfo.firstName} {payslipDetails?.employeeInfo.lastName || "..."}.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-2">
              {isGeneratingPayslip ? (
                  <div className="flex items-center justify-center h-96">
                      <p>Génération du bulletin de paie...</p>
                  </div>
              ) : payslipDetails ? (
                  <PayslipPreview details={payslipDetails} />
              ) : (
                  <div className="flex items-center justify-center h-96">
                      <p className="text-muted-foreground">La prévisualisation du bulletin n'a pas pu être générée.</p>
                  </div>
              )}
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingStaff ? "Modifier un Membre" : "Ajouter un Membre du Personnel"}</DialogTitle>
              <DialogDescription>
                {editingStaff ? `Mettez à jour les informations de ${editingStaff.firstName} ${editingStaff.lastName}.` : "Renseignez les informations du nouveau membre."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form id="staff-form" onSubmit={form.handleSubmit(handleSubmit)}>
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="general">Général</TabsTrigger>
                            <TabsTrigger value="payroll">Paie</TabsTrigger>
                            <TabsTrigger value="personal">Personnel</TabsTrigger>
                            <TabsTrigger value="banking">Bancaire</TabsTrigger>
                        </TabsList>
                        <div className="py-6 max-h-[60vh] overflow-y-auto px-1">
                            <TabsContent value="general" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Prénom" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Nom de famille" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle/Poste</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un rôle..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="directeur">Directeur</SelectItem><SelectItem value="enseignant">Enseignant</SelectItem><SelectItem value="comptable">Comptable</SelectItem><SelectItem value="personnel">Personnel</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                {watchedRole === 'enseignant' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                                        <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Matière principale</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl><SelectContent>{allSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Classe principale</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="(Optionnel)" /></SelectTrigger></FormControl><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@exemple.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                   {!editingStaff && (
                                    <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de Passe</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                   )}
                                </div>
                                 <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="(Optionnel)" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="hireDate" render={({ field }) => (<FormItem><FormLabel>Date d'embauche</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </TabsContent>
                            <TabsContent value="payroll" className="space-y-4">
                                <FormField control={form.control} name="baseSalary" render={({ field }) => (<FormItem><FormLabel>Salaire de base (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Accordion type="single" collapsible className="w-full">
                                  <AccordionItem value="indemnities">
                                    <AccordionTrigger>Indemnités et Primes</AccordionTrigger>
                                    <AccordionContent>
                                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                          <FormField control={form.control} name="indemniteTransportImposable" render={({ field }) => (<FormItem><FormLabel>Transport (imposable)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                          <FormField control={form.control} name="transportNonImposable" render={({ field }) => (<FormItem><FormLabel>Transport (non-imposable)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                          <FormField control={form.control} name="indemniteLogement" render={({ field }) => (<FormItem><FormLabel>Logement</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                          <FormField control={form.control} name="indemniteResponsabilite" render={({ field }) => (<FormItem><FormLabel>Responsabilité</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                          <FormField control={form.control} name="indemniteSujetion" render={({ field }) => (<FormItem><FormLabel>Sujétion</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                          <FormField control={form.control} name="indemniteCommunication" render={({ field }) => (<FormItem><FormLabel>Communication</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                          <FormField control={form.control} name="indemniteRepresentation" render={({ field }) => (<FormItem><FormLabel>Représentation</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                            </TabsContent>
                             <TabsContent value="personal" className="space-y-4">
                                 <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="situationMatrimoniale" render={({ field }) => (<FormItem><FormLabel>Situation Matrimoniale</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Célibataire">Célibataire</SelectItem><SelectItem value="Marié(e)">Marié(e)</SelectItem><SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem><SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem></SelectContent></Select></FormItem>)} />
                                    <FormField control={form.control} name="enfants" render={({ field }) => (<FormItem><FormLabel>Enfants à charge</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                 </div>
                                 <FormField control={form.control} name="categorie" render={({ field }) => (<FormItem><FormLabel>Catégorie</FormLabel><FormControl><Input placeholder="Ex: Catégorie 7" {...field} /></FormControl></FormItem>)} />
                                <h4 className="font-semibold text-sm pt-2">Informations CNPS</h4>
                                <FormField control={form.control} name="cnpsEmploye" render={({ field }) => (<FormItem><FormLabel>N° CNPS Employé</FormLabel><FormControl><Input placeholder="Numéro CNPS" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="CNPS" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Soumis aux cotisations CNPS</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                            </TabsContent>
                            <TabsContent value="banking" className="space-y-4">
                                 <FormField control={form.control} name="banque" render={({ field }) => (<FormItem><FormLabel>Banque</FormLabel><FormControl><Input placeholder="Nom de la banque" {...field} /></FormControl></FormItem>)} />
                                 <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="CB" render={({ field }) => (<FormItem><FormLabel>Code Banque</FormLabel><FormControl><Input placeholder="CB" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="CG" render={({ field }) => (<FormItem><FormLabel>Code Guichet</FormLabel><FormControl><Input placeholder="CG" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="Cle_RIB" render={({ field }) => (<FormItem><FormLabel>Clé RIB</FormLabel><FormControl><Input placeholder="Clé" {...field} /></FormControl></FormItem>)} />
                                 </div>
                                 <FormField control={form.control} name="numeroCompte" render={({ field }) => (<FormItem><FormLabel>Numéro de Compte</FormLabel><FormControl><Input placeholder="Numéro de compte" {...field} /></FormControl></FormItem>)} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </form>
            </Form>
             <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" form="staff-form" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
