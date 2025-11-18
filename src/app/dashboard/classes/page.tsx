
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, User, Building, MoreHorizontal, X, Settings } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";

// Define TypeScript interfaces based on backend.json
interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone?: string;
  class?: string;
}

interface Class {
  id: string;
  name: string;
  studentCount: number;
  mainTeacherId: string;
  building: string;
  cycle: string;
}

interface Cycle {
    id: string;
    name: string;
    order: number;
}


export default function ClassesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const schoolId = user?.customClaims?.schoolId;


  // --- Firestore Data Hooks ---
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/teachers`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/classes`) : null, [firestore, schoolId]);
  const cyclesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `schools/${schoolId}/cycles`), orderBy('order')) : null, [firestore, schoolId]);
  
  const { data: teachersData, loading: teachersLoading, add: addTeacher } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading, add: addClass } = useCollection(classesQuery);
  const { data: cyclesData, loading: cyclesLoading, add: addCycle } = useCollection(cyclesQuery);

  const teachers: Teacher[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Teacher)) || [], [teachersData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);
  const cycles: Cycle[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle)) || [], [cyclesData]);
  
  // --- UI State ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManageCyclesDialogOpen, setIsManageCyclesDialogOpen] = useState(false);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  
  // Form states
  const [formClassName, setFormClassName] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formStudentCount, setFormStudentCount] = useState("");
  const [formBuilding, setFormBuilding] = useState("");
  const [formCycleName, setFormCycleName] = useState("");
  const [newCycleName, setNewCycleName] = useState("");

  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [cycleToDelete, setCycleToDelete] = useState<Cycle | null>(null);

  // Add teacher dialog state
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState("");


  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);


  const getMainTeacher = (teacherId?: string) => {
    if (!teacherId) return null;
    return teachers.find(t => t.id === teacherId);
  };

  const resetAddDialog = () => {
    setFormClassName("");
    setFormTeacherId("");
    setFormStudentCount("");
    setFormBuilding("");
    setFormCycleName("");
  }
  
  const getCycleDocRef = (cycleId: string) => doc(firestore, `schools/${schoolId}/cycles/${cycleId}`);
  const getClassDocRef = (classId: string) => doc(firestore, `schools/${schoolId}/classes/${classId}`);

  // --- CRUD Operations ---
  const handleAddClass = async () => {
    if (!schoolId || !formClassName || !formTeacherId || !formStudentCount || !formBuilding || !formCycleName) {
        toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
        return;
    }
    
    const newClassData = {
        name: formClassName,
        mainTeacherId: formTeacherId,
        studentCount: parseInt(formStudentCount, 10),
        building: formBuilding,
        cycle: formCycleName,
    };

    try {
      await addClass(newClassData);
      toast({ title: "Classe ajoutée", description: `La classe ${formClassName} a été créée avec succès.` });
      resetAddDialog();
      setIsAddDialogOpen(false);
    } catch(e) {
      // Error is already handled by useCollection hook
    }
  };
  
  const handleOpenEditDialog = (cls: Class) => {
    setEditingClass(cls);
    setFormClassName(cls.name);
    setFormTeacherId(cls.mainTeacherId);
    setFormStudentCount(String(cls.studentCount));
    setFormBuilding(cls.building);
    setFormCycleName(cls.cycle);
    setIsEditDialogOpen(true);
  };

  const handleEditClass = () => {
    if (!schoolId || !editingClass || !formClassName || !formTeacherId || !formStudentCount || !formBuilding || !formCycleName) {
       toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }
    
    const classDocRef = getClassDocRef(editingClass.id);
    const updatedData = {
      name: formClassName,
      mainTeacherId: formTeacherId,
      studentCount: parseInt(formStudentCount, 10),
      building: formBuilding,
      cycle: formCycleName,
    };
    
    setDoc(classDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Classe modifiée", description: `Les informations de la classe ${formClassName} ont été mises à jour.` });
        setIsEditDialogOpen(false);
        setEditingClass(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: classDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
    });
  }

  const handleOpenDeleteDialog = (cls: Class) => {
    setClassToDelete(cls);
    setIsDeleteDialogOpen(true);
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
  
  const handleCreateCycle = async (cycleName: string) => {
    if (!schoolId || !cycleName.trim()) {
        toast({ variant: "destructive", title: "Erreur", description: "Le nom du cycle ne peut pas être vide." });
        return null;
    }
    if (cycles.some(c => c.name.toLowerCase() === cycleName.toLowerCase())) {
        toast({ variant: "destructive", title: "Erreur", description: "Ce cycle existe déjà." });
        return null;
    }
    const newCycleData = { name: cycleName, order: (cycles.length > 0 ? Math.max(...cycles.map(c => c.order)) : 0) + 1 };
    
    try {
        const docRef = await addCycle(newCycleData);
        setNewCycleName("");
        toast({ title: "Niveau ajouté", description: `Le niveau "${cycleName}" a été ajouté.` });
        return { value: docRef.id, label: cycleName };
    } catch(e) {
      // Error is handled by useCollection
      return null;
    }
  };
  
  const handleOpenDeleteCycleDialog = (cycle: Cycle) => {
      const classesInCycle = classes.filter(c => c.cycle === cycle.name).length;
      if (classesInCycle > 0) {
          toast({ variant: "destructive", title: "Action impossible", description: `Impossible de supprimer le cycle "${cycle.name}" car il contient ${classesInCycle} classe(s).` });
          return;
      }
      setCycleToDelete(cycle);
  };

  const handleDeleteCycle = () => {
      if (!schoolId || !cycleToDelete) return;
      const cycleDocRef = getCycleDocRef(cycleToDelete.id);
      deleteDoc(cycleDocRef)
      .then(() => {
          toast({ title: "Cycle supprimé", description: `Le cycle "${cycleToDelete.name}" a été supprimé.` });
          setCycleToDelete(null);
      }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({ path: cycleDocRef.path, operation: 'delete' });
          errorEmitter.emit('permission-error', permissionError);
      });
  }
  
  const handleOpenAddTeacherDialog = (teacherName: string) => {
    setNewTeacherName(teacherName);
    setNewTeacherEmail("");
    setNewTeacherSubject("");
    setIsAddTeacherDialogOpen(true);
  }

  const handleCreateTeacher = async () => {
    if (!schoolId || !newTeacherName || !newTeacherSubject || !newTeacherEmail) {
        toast({ variant: "destructive", title: "Erreur", description: "Le nom, la matière et l'email sont requis." });
        return null;
    }
    const newTeacherData = { name: newTeacherName, subject: newTeacherSubject, email: newTeacherEmail };
    try {
        const docRef = await addTeacher(newTeacherData);
        toast({ title: "Enseignant ajouté", description: `${newTeacherName} a été ajouté(e).` });
        setIsAddTeacherDialogOpen(false);
        setFormTeacherId(docRef.id); // auto-select the newly created teacher
        return { value: docRef.id, label: newTeacherName };
    } catch(e) {
        // error handled by hook
        return null;
    }
  }


  const isLoading = !schoolId || classesLoading || teachersLoading || cyclesLoading;
  
  if (!isClient) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-1/2" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-36" />
                </div>
            </div>
             <Skeleton className="h-10 w-full" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
        </div>
    );
  }

  const cycleOptions = cycles.map(c => ({ value: c.name, label: c.name }));
  const teacherOptions = teachers.map(t => ({ value: t.id, label: t.name }));

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion des Classes</h1>
            <p className="text-muted-foreground">Créez, visualisez et modifiez les classes de votre école par cycle.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isManageCyclesDialogOpen} onOpenChange={setIsManageCyclesDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Gérer les Niveaux</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gérer les Niveaux</DialogTitle>
                        <DialogDescription>Ajoutez ou supprimez des niveaux d'enseignement.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex gap-2">
                            <Input value={newCycleName} onChange={(e) => setNewCycleName(e.target.value)} placeholder="Nom du nouveau niveau"/>
                            <Button onClick={() => handleCreateCycle(newCycleName)}>Ajouter</Button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            <Label>Niveaux actuels</Label>
                            {cyclesLoading ? <Skeleton className="h-10 w-full" /> : cycles.map(cycle => (
                                <div key={cycle.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                    <span>{cycle.name}</span>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleOpenDeleteCycleDialog(cycle)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              if(!isOpen) resetAddDialog();
              setIsAddDialogOpen(isOpen);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Classe
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Ajouter une Nouvelle Classe</DialogTitle>
                  <DialogDescription>
                    Renseignez les informations de la nouvelle classe.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nom</Label>
                    <Input id="name" value={formClassName} onChange={(e) => setFormClassName(e.target.value)} className="col-span-3" placeholder="Ex: Sixième A" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="building" className="text-right">Bâtiment</Label>
                    <Input id="building" value={formBuilding} onChange={(e) => setFormBuilding(e.target.value)} className="col-span-3" placeholder="Ex: Bâtiment A" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cycle" className="text-right">Niveau</Label>
                     <Combobox
                        className="col-span-3"
                        placeholder="Sélectionner un niveau"
                        searchPlaceholder="Chercher un niveau..."
                        options={cycleOptions}
                        value={formCycleName}
                        onValueChange={setFormCycleName}
                        onCreate={handleCreateCycle}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacher" className="text-right">Prof. Principal</Label>
                    <Combobox
                        className="col-span-3"
                        placeholder="Sélectionner un enseignant"
                        searchPlaceholder="Chercher un enseignant..."
                        options={teacherOptions}
                        value={formTeacherId}
                        onValueChange={setFormTeacherId}
                        onCreate={handleOpenAddTeacherDialog}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="students" className="text-right">Nb. Élèves</Label>
                    <Input id="students" type="number" value={formStudentCount} onChange={(e) => setFormStudentCount(e.target.value)} className="col-span-3" placeholder="Ex: 25"/>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleAddClass}>Ajouter la classe</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            </div>
        ) : (
            <Tabs defaultValue={cycles[0]?.name} className="space-y-4">
                <TabsList>
                    {cycles.map((cycle) => ( <TabsTrigger key={cycle.id} value={cycle.name}>{cycle.name}</TabsTrigger> ))}
                </TabsList>
                {cycles.map((cycle) => (
                    <TabsContent key={cycle.id} value={cycle.name}>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {classes.filter(c => c.cycle === cycle.name).map((cls) => {
                                const mainTeacher = getMainTeacher(cls.mainTeacherId);
                                return (
                                <Card key={cls.id} id={cls.id} className="flex flex-col">
                                    <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>{cls.name}</CardTitle>
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenEditDialog(cls)}>Modifier</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(cls)}>Supprimer</DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <CardDescription>ID de la classe: {cls.id}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3 flex-1">
                                        <div className="flex items-center text-sm text-muted-foreground"><Building className="mr-2 h-4 w-4 flex-shrink-0" /><span>Bâtiment: {cls.building}</span></div>
                                        <div className="flex items-center text-sm text-muted-foreground"><User className="mr-2 h-4 w-4 flex-shrink-0" /><span>Prof. principal: {mainTeacher?.name || 'Non assigné'}</span></div>
                                        <div className="flex items-center text-sm text-muted-foreground"><Users className="mr-2 h-4 w-4 flex-shrink-0" /><span>{cls.studentCount} élèves</span></div>
                                    </CardContent>
                                </Card>
                                );
                            })}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        )}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier la Classe</DialogTitle>
            <DialogDescription>Mettez à jour les informations de la classe <strong>{editingClass?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Nom</Label>
              <Input id="edit-name" value={formClassName} onChange={(e) => setFormClassName(e.target.value)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-building" className="text-right">Bâtiment</Label>
              <Input id="edit-building" value={formBuilding} onChange={(e) => setFormBuilding(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-cycle" className="text-right">Niveau</Label>
               <Combobox
                    className="col-span-3"
                    placeholder="Sélectionner un niveau"
                    searchPlaceholder="Chercher un niveau..."
                    options={cycleOptions}
                    value={formCycleName}
                    onValueChange={setFormCycleName}
                    onCreate={handleCreateCycle}
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher" className="text-right">Prof. Principal</Label>
               <Combobox
                    className="col-span-3"
                    placeholder="Sélectionner un enseignant"
                    searchPlaceholder="Chercher un enseignant..."
                    options={teacherOptions}
                    value={formTeacherId}
                    onValueChange={setFormTeacherId}
                    onCreate={handleOpenAddTeacherDialog}
                />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-students" className="text-right">Nb. Élèves</Label>
              <Input id="edit-students" type="number" value={formStudentCount} onChange={(e) => setFormStudentCount(e.target.value)} className="col-span-3"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditClass}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Add Teacher Dialog (modal over a modal) */}
       <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un nouvel enseignant</DialogTitle>
                    <DialogDescription>
                        L'enseignant "{newTeacherName}" n'a pas été trouvé. Veuillez fournir les détails requis.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-teacher-name" className="text-right">Nom</Label>
                        <Input id="new-teacher-name" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-teacher-subject" className="text-right">Matière principale</Label>
                        <Input id="new-teacher-subject" value={newTeacherSubject} onChange={e => setNewTeacherSubject(e.target.value)} className="col-span-3" placeholder="Ex: Mathématiques" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-teacher-email" className="text-right">Email</Label>
                        <Input id="new-teacher-email" type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} className="col-span-3" placeholder="Ex: prof@ecole.com" />
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

      {/* Delete Cycle Confirmation Dialog */}
       <AlertDialog open={!!cycleToDelete} onOpenChange={(isOpen) => !isOpen && setCycleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Le cycle <strong>{cycleToDelete?.name}</strong> sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCycleToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCycle} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
