

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Users, User, Building, MoreHorizontal, BookCopy, AlertTriangle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, query, where, getDocs, limit, writeBatch } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { schoolClasses, schoolCycles, higherEdFiliere } from '@/lib/data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { staff as Staff, class_type as Class } from '@/lib/data-types';
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Define Zod schema for validation
const classSchema = z.object({
  cycle: z.string().min(1, { message: "Le cycle est requis." }),
  grade: z.string().min(1, { message: "Le niveau est requis." }),
  name: z.string().min(1, { message: "Le nom de la classe est requis." }),
  filiere: z.string().optional(),
  building: z.string().min(1, { message: "Le bâtiment est requis." }),
  mainTeacherId: z.string().min(1, { message: "Le professeur principal est requis." }),
  // Fee fields
  amount: z.string().min(1, { message: "Le montant est requis." }),
  installments: z.string().min(1, { message: "Les modalités de paiement sont requises." }),
});

type ClassFormValues = z.infer<typeof classSchema>;

// Define TypeScript interfaces based on backend.json
interface StaffWithId extends Staff {
  id: string;
}

interface ClassWithId extends Class {
  id: string;
}

// Using a static type for cycles for reliability
type Cycle = {
    name: string;
    order: number;
};


export default function ClassesPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();


  // --- Firestore Data Hooks ---
  const personnelQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant')) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  
  const { data: personnelData, loading: personnelLoading } = useCollection(personnelQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  // Use the static, reliable list of cycles from data.ts
  const cycles: Cycle[] = useMemo(() => schoolCycles.sort((a,b) => a.order - b.order), []);

  const teachers: StaffWithId[] = useMemo(() => personnelData?.map(d => ({ id: d.id, ...d.data() } as StaffWithId)) || [], [personnelData]);
  const classes: ClassWithId[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as ClassWithId)) || [], [classesData]);
  
  // --- UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isDeleteErrorAlertOpen, setIsDeleteErrorAlertOpen] = useState(false);
  
  const [editingClass, setEditingClass] = useState<ClassWithId | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassWithId | null>(null);

  // Add teacher dialog state
  const [newTeacherFirstName, setNewTeacherFirstName] = useState("");
  const [newTeacherLastName, setNewTeacherLastName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState("");

  const { toast } = useToast();
  
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      cycle: '',
      grade: '',
      name: '',
      filiere: '',
      building: '',
      mainTeacherId: '',
      amount: '',
      installments: '',
    },
  });

  const watchedCycle = form.watch('cycle');

  useEffect(() => {
    if (isFormOpen) {
      if (editingClass) {
        // NOTE: Editing fees is handled in the fees page, so we don't pre-fill them here.
        form.reset({
          cycle: editingClass.cycle,
          grade: editingClass.grade,
          name: editingClass.name,
          filiere: editingClass.filiere || '',
          building: editingClass.building,
          mainTeacherId: editingClass.mainTeacherId,
          amount: '', // Reset fee fields for editing to avoid confusion
          installments: '',
        });
      } else {
        form.reset({
          cycle: '',
          grade: '',
          name: '',
          filiere: '',
          building: '',
          mainTeacherId: '',
          amount: '',
          installments: '',
        });
      }
    }
  }, [isFormOpen, editingClass, form]);
  
  const getMainTeacher = (teacherId?: string) => {
    if (!teacherId) return null;
    return teachers.find(t => t.id === teacherId);
  };
  
  const getClassDocRef = (classId: string) => doc(firestore, `ecoles/${schoolId}/classes/${classId}`);

  // --- CRUD Operations ---
  const handleClassSubmit = async (values: ClassFormValues) => {
    if (!schoolId) {
        toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
        return;
    }
    
    const classData = {
        schoolId,
        cycle: values.cycle,
        grade: values.grade,
        name: values.name,
        filiere: values.cycle === "Enseignement Supérieur" ? values.filiere : "",
        building: values.building,
        mainTeacherId: values.mainTeacherId,
        studentCount: editingClass?.studentCount || 0, // Preserve count on edit
    };
    
    const feeData = {
        schoolId,
        grade: values.grade, // Use grade for the fee link
        amount: values.amount,
        installments: values.installments,
        details: `Frais pour la classe ${values.name}`,
    };

    const batch = writeBatch(firestore);

    try {
        if(editingClass) {
            // Update class only. Fee editing is separate.
            const classDocRef = getClassDocRef(editingClass.id);
            batch.update(classDocRef, classData);
            
            await batch.commit();
            toast({ title: "Classe modifiée", description: `Les informations de la classe ${values.name} ont été mises à jour.` });
        } else {
            // Create both class and fee documents
            const newClassRef = doc(collection(firestore, `ecoles/${schoolId}/classes`));
            batch.set(newClassRef, classData);

            const newFeeRef = doc(collection(firestore, `ecoles/${schoolId}/frais_scolarite`));
            batch.set(newFeeRef, feeData);
            
            await batch.commit();
            toast({ title: "Classe et Frais ajoutés", description: `La classe ${values.name} et sa grille tarifaire ont été créées.` });
        }
        setIsFormOpen(false);
        setEditingClass(null);
    } catch(serverError) {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}/classes & /ecoles/${schoolId}/frais_scolarite`,
            operation: editingClass ? 'update' : 'create',
            requestResourceData: { classData, feeData: editingClass ? undefined : feeData }
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const handleOpenFormDialog = (cls: ClassWithId | null) => {
    setEditingClass(cls);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = async (cls: ClassWithId) => {
    setClassToDelete(cls);
    if (!schoolId) return;

    // Check if any students are in this class
    const studentsInClassQuery = query(
      collection(firestore, `ecoles/${schoolId}/eleves`),
      where('classId', '==', cls.id),
      limit(1)
    );

    const studentsSnapshot = await getDocs(studentsInClassQuery);
    if (!studentsSnapshot.empty) {
      setIsDeleteErrorAlertOpen(true);
    } else {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteClass = () => {
    if (!schoolId || !classToDelete) return;
    
    const classDocRef = getClassDocRef(classToDelete.id);
    deleteDoc(classDocRef)
    .then(() => {
        toast({ title: "Classe supprimée", description: `La classe ${classToDelete.name} a été supprimée.` });
        setIsDeleteDialogOpen(false);
        setClassToDelete(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: classDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  }
  
  const handleOpenAddTeacherDialog = async (teacherName: string) => {
    const nameParts = teacherName.split(' ');
    setNewTeacherFirstName(nameParts[0] || '');
    setNewTeacherLastName(nameParts.slice(1).join(' ') || '');
    setNewTeacherEmail("");
    setNewTeacherSubject("");
    setIsAddTeacherDialogOpen(true);
  }

  const handleCreateTeacher = async () => {
    if (!schoolId || !newTeacherFirstName || !newTeacherLastName || !newTeacherSubject || !newTeacherEmail) {
        toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis pour créer un enseignant." });
        return null;
    }
    const newTeacherData = { 
        schoolId,
        firstName: newTeacherFirstName, 
        lastName: newTeacherLastName, 
        role: 'enseignant',
        subject: newTeacherSubject, 
        email: newTeacherEmail,
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
    };
    const staffCollectionRef = collection(firestore, `ecoles/${schoolId}/personnel`);
    try {
        const docRef = await addDoc(staffCollectionRef, newTeacherData);
        toast({ title: "Enseignant ajouté", description: `${newTeacherFirstName} ${newTeacherLastName} a été ajouté(e).` });
        setIsAddTeacherDialogOpen(false);
        form.setValue('mainTeacherId', docRef.id);
        return { value: docRef.id, label: `${newTeacherFirstName} ${newTeacherLastName}` };
    } catch(serverError) {
        const permissionError = new FirestorePermissionError({ path: staffCollectionRef.path, operation: 'create', requestResourceData: newTeacherData });
        errorEmitter.emit('permission-error', permissionError);
        return null;
    }
  }

  const isLoading = schoolDataLoading || classesLoading || personnelLoading;
  
  if (isLoading) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-36" />
                </div>
            </div>
             <Skeleton className="h-10 w-full max-w-lg" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
        </div>
    );
  }

  const teacherOptions = teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));
  const cycleOptions = cycles.map(c => ({ value: c.name, label: c.name }));
  const gradeOptions = schoolClasses
    .filter(c => c.cycle === watchedCycle)
    .map(c => ({ value: c.name, label: c.name }));
  const filiereOptions = higherEdFiliere.map(f => ({ value: f, label: f }));
  
  const renderFormContent = () => (
     <Form {...form}>
        <form id="class-form" onSubmit={form.handleSubmit(handleClassSubmit)} className="space-y-4">
           <Tabs defaultValue="general">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="general">Informations Générales</TabsTrigger>
               <TabsTrigger value="fees" disabled={!!editingClass}>Scolarité</TabsTrigger>
             </TabsList>
             <div className="py-4 max-h-[60vh] overflow-y-auto px-1">
                 <TabsContent value="general" className="mt-0 space-y-4">
                    <FormField control={form.control} name="cycle" render={({ field }) => ( <FormItem> <FormLabel>Cycle</FormLabel> <FormControl> <Combobox placeholder="Sélectionner un cycle" searchPlaceholder="Chercher un cycle..." options={cycleOptions} value={field.value} onValueChange={(value) => { field.onChange(value); form.setValue('grade', ''); form.setValue('name', ''); form.setValue('filiere', ''); }} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    {watchedCycle && <FormField control={form.control} name="grade" render={({ field }) => ( <FormItem> <FormLabel>Niveau</FormLabel> <FormControl> <Combobox placeholder="Sélectionner un niveau" searchPlaceholder="Chercher un niveau..." options={gradeOptions} value={field.value} onValueChange={(value) => { field.onChange(value); form.setValue('name', value); }}/> </FormControl> <FormMessage /> </FormItem> )}/>}
                    {watchedCycle === "Enseignement Supérieur" && <FormField control={form.control} name="filiere" render={({ field }) => ( <FormItem> <FormLabel>Filière</FormLabel> <FormControl> <Combobox placeholder="Sélectionner une filière" searchPlaceholder="Chercher une filière..." options={filiereOptions} value={field.value} onValueChange={field.onChange}/> </FormControl> </FormItem> )}/>}
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nom Complet de la Classe</FormLabel> <FormControl> <Input placeholder="Ex: CM2 A, Terminale D, etc." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="building" render={({ field }) => ( <FormItem> <FormLabel>Bâtiment</FormLabel> <FormControl> <Input placeholder="Ex: Bâtiment A" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="mainTeacherId" render={({ field }) => ( <FormItem> <FormLabel>Prof. Principal</FormLabel> <FormControl> <Combobox placeholder="Sélectionner un enseignant" searchPlaceholder="Chercher ou créer..." options={teacherOptions} value={field.value} onValueChange={field.onChange} onCreate={handleOpenAddTeacherDialog}/> </FormControl> <FormMessage /> </FormItem> )}/>
                 </TabsContent>
                 <TabsContent value="fees" className="mt-0 space-y-4">
                     <p className="text-sm text-muted-foreground">Définissez les frais de scolarité qui seront associés à cette classe. Ces informations peuvent être modifiées plus tard dans la section "Frais de Scolarité".</p>
                    <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel>Montant Total (CFA)</FormLabel> <FormControl> <Input type="number" placeholder="Ex: 980000" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="installments" render={({ field }) => ( <FormItem> <FormLabel>Modalités de Paiement</FormLabel> <FormControl> <Input placeholder="Ex: 10 tranches mensuelles" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                 </TabsContent>
             </div>
           </Tabs>
        </form>
    </Form>
  );


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion des Classes</h1>
            <p className="text-muted-foreground">Créez, visualisez et modifiez les classes de votre école par cycle.</p>
          </div>
          <div className="flex gap-2">
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger>
                <Button onClick={() => handleOpenFormDialog(null)}>
                    <span className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Ajouter une Classe
                    </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingClass ? "Modifier la Classe" : "Ajouter une Nouvelle Classe"}</DialogTitle>
                  <DialogDescription>
                    {editingClass ? `Renseignez les nouvelles informations de la classe ${editingClass.name}. La modification des frais se fait sur la page dédiée.` : "Renseignez les informations de la nouvelle classe et de sa grille tarifaire."}
                  </DialogDescription>
                </DialogHeader>
                {renderFormContent()}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                  <Button type="submit" form="class-form" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        
        <Tabs defaultValue={cycles[0]?.name} className="space-y-4">
            <TabsList>
                {cycles.map((cycle) => ( <TabsTrigger key={cycle.order} value={cycle.name}>{cycle.name}</TabsTrigger> ))}
            </TabsList>
            {cycles.map((cycle) => (
                <TabsContent key={cycle.order} value={cycle.name}>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {classes.filter(c => c.cycle === cycle.name).map((cls) => {
                            const mainTeacher = getMainTeacher(cls.mainTeacherId);
                            const teacherName = mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}` : 'Non assigné';
                            return (
                            <Card key={cls.id} className="flex flex-col">
                                <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{cls.name}</CardTitle>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenFormDialog(cls)}>Modifier</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(cls)}>Supprimer</DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription>{cls.grade} {cls.filiere ? ` / ${cls.filiere}` : ''}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 flex-1">
                                    <div className="flex items-center text-sm text-muted-foreground"><Users className="mr-2 h-4 w-4 flex-shrink-0" /><span>{cls.studentCount || 0} élève(s)</span></div>
                                    <div className="flex items-center text-sm text-muted-foreground"><User className="mr-2 h-4 w-4 flex-shrink-0" /><span>Prof. principal: {teacherName}</span></div>
                                </CardContent>
                            </Card>
                            );
                        })}
                    </div>
                     {classes.filter(c => c.cycle === cycle.name).length === 0 && (
                        <div className="text-center text-muted-foreground py-10">
                            Aucune classe n'a été créée pour le cycle {cycle.name}.
                        </div>
                    )}
                </TabsContent>
            ))}
        </Tabs>
        
      </div>

       {/* Add Teacher Dialog (modal over a modal) */}
       <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un nouvel enseignant</DialogTitle>
                    <DialogDescription>
                        L'enseignant n'a pas été trouvé. Veuillez fournir les détails requis.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <FormLabel htmlFor="new-teacher-firstname" className="text-right">Prénom</FormLabel>
                        <Input id="new-teacher-firstname" value={newTeacherFirstName} onChange={e => setNewTeacherFirstName(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <FormLabel htmlFor="new-teacher-lastname" className="text-right">Nom</FormLabel>
                        <Input id="new-teacher-lastname" value={newTeacherLastName} onChange={e => setNewTeacherLastName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <FormLabel htmlFor="new-teacher-subject" className="text-right">Matière principale</FormLabel>
                        <Input id="new-teacher-subject" value={newTeacherSubject} onChange={(e) => setNewTeacherSubject(e.target.value)} className="col-span-3" placeholder="Ex: Mathématiques" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <FormLabel htmlFor="new-teacher-email" className="text-right">Email</FormLabel>
                        <Input id="new-teacher-email" type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} className="col-span-3" placeholder="Ex: prof@ecole.com" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddTeacherDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleCreateTeacher}>Créer l'enseignant</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. La classe <strong>{classToDelete?.name}</strong> sera définitivement supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Error Alert */}
      <AlertDialog open={isDeleteErrorAlertOpen} onOpenChange={setIsDeleteErrorAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive" />
                    Impossible de supprimer la classe
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Cette classe ne peut pas être supprimée car elle contient encore des élèves. Veuillez d'abord réaffecter tous les élèves à d'autres classes avant de procéder à la suppression.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsDeleteErrorAlertOpen(false)}>Compris</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
