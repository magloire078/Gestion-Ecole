
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { collection, addDoc, doc, setDoc, deleteDoc, query, where, getDocs, limit } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { schoolClasses, schoolCycles, higherEdFiliere } from '@/lib/data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { teacher as Teacher, class_type as Class } from '@/lib/data-types';

// Define Zod schema for validation
const classSchema = z.object({
  cycle: z.string().min(1, { message: "Le cycle est requis." }),
  name: z.string().min(1, { message: "Le nom de la classe est requis." }),
  filiere: z.string().optional(),
  building: z.string().min(1, { message: "Le bâtiment est requis." }),
  mainTeacherId: z.string().min(1, { message: "Le professeur principal est requis." }),
  studentCount: z.coerce.number().min(0, { message: "Le nombre d'élèves doit être un nombre positif." }),
});

type ClassFormValues = z.infer<typeof classSchema>;

// Define TypeScript interfaces based on backend.json
interface TeacherWithId extends Teacher {
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
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  // Use the static, reliable list of cycles from data.ts
  const cycles: Cycle[] = useMemo(() => schoolCycles.sort((a,b) => a.order - b.order), []);

  const teachers: TeacherWithId[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as TeacherWithId)) || [], [teachersData]);
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
      name: '',
      filiere: '',
      building: '',
      mainTeacherId: '',
      studentCount: 0,
    },
  });

  const watchedCycle = form.watch('cycle');

  useEffect(() => {
    if (isFormOpen) {
      if (editingClass) {
        form.reset({
          cycle: editingClass.cycle,
          name: editingClass.name,
          filiere: editingClass.filiere || '',
          building: editingClass.building,
          mainTeacherId: editingClass.mainTeacherId,
          studentCount: editingClass.studentCount,
        });
      } else {
        form.reset({
          cycle: '',
          name: '',
          filiere: '',
          building: '',
          mainTeacherId: '',
          studentCount: 0,
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
  const handleClassSubmit = (values: ClassFormValues) => {
    if (!schoolId) {
        toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
        return;
    }
    
    const classData = {
        ...values,
        filiere: values.cycle === "Enseignement Supérieur" ? values.filiere : "",
    };

    if(editingClass) {
        // Update
        const classDocRef = getClassDocRef(editingClass.id);
        setDoc(classDocRef, classData, { merge: true })
        .then(() => {
            toast({ title: "Classe modifiée", description: `Les informations de la classe ${values.name} ont été mises à jour.` });
            setIsFormOpen(false);
            setEditingClass(null);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: classDocRef.path, operation: 'update', requestResourceData: classData });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
        // Create
        const classCollectionRef = collection(firestore, `ecoles/${schoolId}/classes`);
        addDoc(classCollectionRef, classData)
        .then(() => {
            toast({ title: "Classe ajoutée", description: `La classe ${values.name} a été créée avec succès.` });
            setIsFormOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: classCollectionRef.path, operation: 'create', requestResourceData: classData });
            errorEmitter.emit('permission-error', permissionError);
        });
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
        firstName: newTeacherFirstName, 
        lastName: newTeacherLastName, 
        subject: newTeacherSubject, 
        email: newTeacherEmail 
    };
    const teacherCollectionRef = collection(firestore, `ecoles/${schoolId}/enseignants`);
    try {
        const docRef = await addDoc(teacherCollectionRef, newTeacherData);
        toast({ title: "Enseignant ajouté", description: `${newTeacherFirstName} ${newTeacherLastName} a été ajouté(e).` });
        setIsAddTeacherDialogOpen(false);
        form.setValue('mainTeacherId', docRef.id);
        return { value: docRef.id, label: `${newTeacherFirstName} ${newTeacherLastName}` };
    } catch(serverError) {
        const permissionError = new FirestorePermissionError({ path: teacherCollectionRef.path, operation: 'create', requestResourceData: newTeacherData });
        errorEmitter.emit('permission-error', permissionError);
        return null;
    }
  }

  const isLoading = schoolDataLoading || classesLoading || teachersLoading;
  
  if (isLoading && !cycles.length) {
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
  const classOptionsForCycle = watchedCycle ? schoolClasses.filter(c => c.cycle === watchedCycle).map(c => ({ value: c.name, label: c.name })) : [];
  const filiereOptions = higherEdFiliere.map(f => ({ value: f, label: f }));
  
  const renderFormContent = () => (
    <Form {...form}>
      <form id="class-form" onSubmit={form.handleSubmit(handleClassSubmit)} className="grid gap-4 py-4">
        <FormField
            control={form.control}
            name="cycle"
            render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Cycle</FormLabel>
                <FormControl className="col-span-3">
                    <Combobox
                        placeholder="Sélectionner un cycle"
                        searchPlaceholder="Chercher un cycle..."
                        options={cycleOptions}
                        value={field.value}
                        onValueChange={(value) => {
                            const cycleOption = cycleOptions.find(c => c.value.toLowerCase() === value.toLowerCase());
                            field.onChange(cycleOption ? cycleOption.value : '');
                            form.setValue('name', ''); // Reset class name when cycle changes
                            form.setValue('filiere', '');
                        }}
                    />
                </FormControl>
                <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
            )}
        />
        {watchedCycle === "Enseignement Supérieur" && (
            <FormField
                control={form.control}
                name="filiere"
                render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Filière</FormLabel>
                    <FormControl className="col-span-3">
                        <Combobox
                            placeholder="Sélectionner une filière"
                            searchPlaceholder="Chercher une filière..."
                            options={filiereOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
                )}
            />
        )}
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Classe</FormLabel>
                <FormControl className="col-span-3">
                    <Combobox
                        placeholder={watchedCycle ? "Sélectionner une classe" : "Sélectionnez un cycle d'abord"}
                        searchPlaceholder="Chercher une classe..."
                        options={classOptionsForCycle}
                        value={field.value}
                        onValueChange={(value) => {
                            const classOption = classOptionsForCycle.find(c => c.value.toLowerCase() === value.toLowerCase());
                            field.onChange(classOption ? classOption.value : '');
                        }}
                    />
                </FormControl>
                 <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="building"
            render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Bâtiment</FormLabel>
                <FormControl className="col-span-3">
                    <Input placeholder="Ex: Bâtiment A" {...field} />
                </FormControl>
                 <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="mainTeacherId"
            render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Prof. Principal</FormLabel>
                <FormControl className="col-span-3">
                    <Combobox
                        placeholder="Sélectionner un enseignant"
                        searchPlaceholder="Chercher ou créer..."
                        options={teacherOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        onCreate={handleOpenAddTeacherDialog}
                    />
                </FormControl>
                 <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="studentCount"
            render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Nb. Élèves</FormLabel>
                <FormControl className="col-span-3">
                    <Input type="number" placeholder="Ex: 25" {...field} />
                </FormControl>
                 <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
            )}
        />
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
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenFormDialog(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Classe
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingClass ? "Modifier la Classe" : "Ajouter une Nouvelle Classe"}</DialogTitle>
                  <DialogDescription>
                    {editingClass ? `Renseignez les nouvelles informations de la classe ${editingClass.name}.` : "Renseignez les informations de la nouvelle classe."}
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
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenFormDialog(cls)}>Modifier</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(cls)}>Supprimer</DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription>ID: {cls.id.substring(0, 10)}...</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 flex-1">
                                    {cls.filiere && <div className="flex items-center text-sm text-muted-foreground"><BookCopy className="mr-2 h-4 w-4 flex-shrink-0" /><span>Filière: {cls.filiere}</span></div>}
                                    <div className="flex items-center text-sm text-muted-foreground"><Building className="mr-2 h-4 w-4 flex-shrink-0" /><span>Bâtiment: {cls.building}</span></div>
                                    <div className="flex items-center text-sm text-muted-foreground"><User className="mr-2 h-4 w-4 flex-shrink-0" /><span>Prof. principal: {teacherName}</span></div>
                                    <div className="flex items-center text-sm text-muted-foreground"><Users className="mr-2 h-4 w-4 flex-shrink-0" /><span>{cls.studentCount} élèves</span></div>
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
