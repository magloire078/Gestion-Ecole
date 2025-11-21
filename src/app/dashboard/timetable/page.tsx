
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
import type { Teacher, Class } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";

interface TimetableEntry {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
}

export default function TimetablePage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  // --- Firestore Data Hooks ---
  const timetableQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/timetable`) : null, [firestore, schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/teachers`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/classes`) : null, [firestore, schoolId]);
  
  const { data: timetableData, loading: timetableLoading } = useCollection(timetableQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const timetable: TimetableEntry[] = useMemo(() => timetableData?.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)) || [], [timetableData]);
  const teachers: Teacher[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Teacher)) || [], [teachersData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  // --- UI State ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newClassId, setNewClassId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntry | null>(null);


  const timetableDetails = useMemo(() => {
    return timetable.map(entry => {
      const classInfo = classes.find(c => c.id === entry.classId);
      const teacherInfo = teachers.find(t => t.id === entry.teacherId);
      return {
        ...entry,
        className: classInfo?.name || 'N/A',
        teacherName: teacherInfo?.name || 'N/A',
      };
    });
  }, [timetable, classes, teachers]);

  const getEntryDocRef = (entryId: string) => doc(firestore, `schools/${schoolId}/timetable/${entryId}`);

  const resetForm = () => {
    setNewClassId("");
    setNewTeacherId("");
    setNewSubject("");
  };

  const handleAddEntry = () => {
    if (!schoolId || !newClassId || !newTeacherId || !newSubject) {
      toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }

    const newEntryData = {
      classId: newClassId,
      teacherId: newTeacherId,
      subject: newSubject,
    };

    const timetableCollectionRef = collection(firestore, `schools/${schoolId}/timetable`);
    addDoc(timetableCollectionRef, newEntryData)
    .then(() => {
        toast({ title: "Entrée ajoutée", description: "La nouvelle entrée a été ajoutée à l'emploi du temps." });
        resetForm();
        setIsAddDialogOpen(false);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: timetableCollectionRef.path, operation: 'create', requestResourceData: newEntryData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const handleOpenEditDialog = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setNewClassId(entry.classId);
    setNewTeacherId(entry.teacherId);
    setNewSubject(entry.subject);
    setIsEditDialogOpen(true);
  };

  const handleEditEntry = () => {
    if (!schoolId || !editingEntry || !newClassId || !newTeacherId || !newSubject) {
       toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }

    const updatedData = {
      classId: newClassId,
      teacherId: newTeacherId,
      subject: newSubject,
    };
    
    const entryDocRef = getEntryDocRef(editingEntry.id);
    setDoc(entryDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Entrée modifiée", description: "L'entrée de l'emploi du temps a été mise à jour." });
        setIsEditDialogOpen(false);
        setEditingEntry(null);
        resetForm();
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: entryDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleOpenDeleteDialog = (entry: TimetableEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEntry = () => {
    if (!schoolId || !entryToDelete) return;
    
    const entryDocRef = getEntryDocRef(entryToDelete.id);
    deleteDoc(entryDocRef)
    .then(() => {
        toast({ title: "Entrée supprimée", description: "L'entrée a été supprimée de l'emploi du temps." });
        setIsDeleteDialogOpen(false);
        setEntryToDelete(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: entryDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const isLoading = schoolLoading || timetableLoading || teachersLoading || classesLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Emploi du Temps</h1>
            <p className="text-muted-foreground">Consultez et gérez les attributions des enseignants par classe et par matière.</p>
          </div>
           <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
               if(!isOpen) resetForm();
               setIsAddDialogOpen(isOpen);
           }}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Entrée</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter à l'Emploi du Temps</DialogTitle>
                <DialogDescription>Sélectionnez une classe, un enseignant et une matière.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="class" className="text-right">Classe</Label>
                   <Select onValueChange={setNewClassId} value={newClassId}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((cls: Class) => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher" className="text-right">Enseignant</Label>
                   <Select onValueChange={setNewTeacherId} value={newTeacherId}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher: Teacher) => (<SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">Matière</Label>
                  <Input id="subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="col-span-3" placeholder="Ex: Mathématiques" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddEntry}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classe</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Enseignant</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : timetableDetails.length > 0 ? (
                  timetableDetails.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.className}</TableCell>
                      <TableCell>{entry.subject}</TableCell>
                      <TableCell>{entry.teacherName}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(entry)}>Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(entry)}>Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">Aucune entrée dans l'emploi du temps.</TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>

       {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier l'Entrée</DialogTitle>
             <DialogDescription>Mettez à jour la classe, l'enseignant ou la matière.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-class" className="text-right">Classe</Label>
                   <Select onValueChange={setNewClassId} value={newClassId}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                    <SelectContent>{classes.map((cls: Class) => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-teacher" className="text-right">Enseignant</Label>
                   <Select onValueChange={setNewTeacherId} value={newTeacherId}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                    <SelectContent>{teachers.map((teacher: Teacher) => (<SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-subject" className="text-right">Matière</Label>
                  <Input id="edit-subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="col-span-3" />
                </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditEntry}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L'entrée sera définitivement supprimée de l'emploi du temps.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    