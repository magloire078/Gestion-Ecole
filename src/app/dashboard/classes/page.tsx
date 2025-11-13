
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  // For now, we'll hardcode the schoolId. In a real app, this would come from user's custom claims.
  const schoolId = 'test-school';

  // --- Firestore Data Hooks ---
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/teachers`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/classes`) : null, [firestore, schoolId]);
  const cyclesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `schools/${schoolId}/cycles`), orderBy('order')) : null, [firestore, schoolId]);
  
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);

  const teachers: Teacher[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Teacher)) || [], [teachersData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);
  const cycles: Cycle[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle)) || [], [cyclesData]);
  
  // --- UI State ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManageCyclesDialogOpen, setIsManageCyclesDialogOpen] = useState(false);
  
  // Form states
  const [formClassName, setFormClassName] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formStudentCount, setFormStudentCount] = useState("");
  const [formBuilding, setFormBuilding] = useState("");
  const [formCycle, setFormCycle] = useState("");
  const [newCycleName, setNewCycleName] = useState("");

  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [cycleToDelete, setCycleToDelete] = useState<Cycle | null>(null);

  const { toast } = useToast();

  const getMainTeacher = (teacherId?: string) => {
    if (!teacherId) return null;
    return teachers.find(t => t.id === teacherId);
  };

  const resetAddDialog = () => {
    setFormClassName("");
    setFormTeacherId("");
    setFormStudentCount("");
    setFormBuilding("");
    setFormCycle("");
  }
  
  const getCycleDocRef = (cycleId: string) => doc(firestore, `schools/${schoolId}/cycles/${cycleId}`);
  const getClassDocRef = (classId: string) => doc(firestore, `schools/${schoolId}/classes/${classId}`);

  // --- CRUD Operations ---
  const handleAddClass = async () => {
    if (!formClassName || !formTeacherId || !formStudentCount || !formBuilding || !formCycle) {
        toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
        return;
    }
    
    const newClassData = {
        name: formClassName,
        mainTeacherId: formTeacherId,
        studentCount: parseInt(formStudentCount, 10),
        building: formBuilding,
        cycle: formCycle,
    };

    const classesCollectionRef = collection(firestore, `schools/${schoolId}/classes`);
    addDoc(classesCollectionRef, newClassData)
    .then(() => {
        toast({ title: "Classe ajoutée", description: `La classe ${formClassName} a été créée avec succès.` });
        resetAddDialog();
        setIsAddDialogOpen(false);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: classesCollectionRef.path, operation: 'create', requestResourceData: newClassData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const handleOpenEditDialog = (cls: Class) => {
    setEditingClass(cls);
    setFormClassName(cls.name);
    setFormTeacherId(cls.mainTeacherId);
    setFormStudentCount(String(cls.studentCount));
    setFormBuilding(cls.building);
    setFormCycle(cls.cycle);
    setIsEditDialogOpen(true);
  };

  const handleEditClass = async () => {
    if (!editingClass || !formClassName || !formTeacherId || !formStudentCount || !formBuilding || !formCycle) {
       toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }
    
    const classDocRef = getClassDocRef(editingClass.id);
    const updatedData = {
      name: formClassName,
      mainTeacherId: formTeacherId,
      studentCount: parseInt(formStudentCount, 10),
      building: formBuilding,
      cycle: formCycle,
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

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    
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
  
  const handleAddCycle = () => {
    if (!newCycleName.trim()) {
        toast({ variant: "destructive", title: "Erreur", description: "Le nom du cycle ne peut pas être vide." });
        return;
    }
    if (cycles.some(c => c.name === newCycleName)) {
        toast({ variant: "destructive", title: "Erreur", description: "Ce cycle existe déjà." });
        return;
    }
    const cyclesCollectionRef = collection(firestore, `schools/${schoolId}/cycles`);
    const newCycleData = { name: newCycleName, order: (cycles.length > 0 ? Math.max(...cycles.map(c => c.order)) : 0) + 1 };
    addDoc(cyclesCollectionRef, newCycleData)
    .then(() => {
        setNewCycleName("");
        toast({ title: "Cycle ajouté", description: `Le cycle "${newCycleName}" a été ajouté.` });
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: cyclesCollectionRef.path, operation: 'create', requestResourceData: newCycleData });
        errorEmitter.emit('permission-error', permissionError);
    });
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
      if (!cycleToDelete) return;
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
  
  const isLoading = classesLoading || teachersLoading || cyclesLoading;

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
                    <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Gérer les niveaux</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gérer les niveaux</DialogTitle>
                        <DialogDescription>Ajoutez ou supprimez des niveaux d'enseignement.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex gap-2">
                            <Input value={newCycleName} onChange={(e) => setNewCycleName(e.target.value)} placeholder="Nom du nouveau niveau"/>
                            <Button onClick={handleAddCycle}>Ajouter</Button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            <Label>Niveaux actuels</Label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : cycles.map(cycle => (
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
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une classe
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Ajouter une nouvelle classe</DialogTitle>
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
                    <Select onValueChange={setFormCycle} value={formCycle}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger>
                      <SelectContent>
                        {cycles.map((cycle) => ( <SelectItem key={cycle.id} value={cycle.name}>{cycle.name}</SelectItem> ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacher" className="text-right">Prof. Principal</Label>
                    <Select onValueChange={setFormTeacherId} value={formTeacherId}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher: Teacher) => ( <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem> ))}
                      </SelectContent>
                    </Select>
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
                <Skeleton className="h-10 w-1/2" />
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
            <DialogTitle>Modifier la classe</DialogTitle>
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
               <Select onValueChange={setFormCycle} value={formCycle}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger>
                <SelectContent>{cycles.map((cycle) => ( <SelectItem key={cycle.id} value={cycle.name}>{cycle.name}</SelectItem> ))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher" className="text-right">Prof. Principal</Label>
               <Select onValueChange={setFormTeacherId} value={formTeacherId}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                <SelectContent>{teachers.map((teacher: Teacher) => ( <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem> ))}</SelectContent>
              </Select>
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
