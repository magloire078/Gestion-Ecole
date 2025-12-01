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
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  startTime: string;
  endTime: string;
}

const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export default function TimetablePage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  // --- Firestore Data Hooks ---
  const timetableQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/emploi_du_temps`) : null, [firestore, schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  
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

  const [formState, setFormState] = useState({
      classId: "",
      teacherId: "",
      subject: "",
      day: "Lundi" as TimetableEntry['day'],
      startTime: "08:00",
      endTime: "09:00",
  });
  
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

  const getEntryDocRef = (entryId: string) => doc(firestore, `ecoles/${schoolId}/emploi_du_temps/${entryId}`);

  const resetForm = () => {
    setFormState({
      classId: "",
      teacherId: "",
      subject: "",
      day: "Lundi",
      startTime: "08:00",
      endTime: "09:00",
    });
  };

  const handleFormChange = (field: keyof typeof formState, value: string) => {
    setFormState(prev => ({...prev, [field]: value}));
  };

  const handleSubmitEntry = (isEditing: boolean) => {
    if (!schoolId || !formState.classId || !formState.teacherId || !formState.subject) {
      toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }

    const newEntryData = { ...formState };

    if (isEditing && editingEntry) {
        // Edit
        const entryDocRef = getEntryDocRef(editingEntry.id);
        setDoc(entryDocRef, newEntryData, { merge: true })
        .then(() => {
            toast({ title: "Entrée modifiée", description: "L'entrée de l'emploi du temps a été mise à jour." });
            setIsEditDialogOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: entryDocRef.path, operation: 'update', requestResourceData: newEntryData });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
        // Add
        const timetableCollectionRef = collection(firestore, `ecoles/${schoolId}/emploi_du_temps`);
        addDoc(timetableCollectionRef, newEntryData)
        .then(() => {
            toast({ title: "Entrée ajoutée", description: "La nouvelle entrée a été ajoutée à l'emploi du temps." });
            setIsAddDialogOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: timetableCollectionRef.path, operation: 'create', requestResourceData: newEntryData });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };
  
  const handleOpenEditDialog = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormState({
        classId: entry.classId,
        teacherId: entry.teacherId,
        subject: entry.subject,
        day: entry.day,
        startTime: entry.startTime,
        endTime: entry.endTime,
    });
    setIsEditDialogOpen(true);
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
  
  const renderForm = (isEditing: boolean) => (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="class" className="text-right">Classe</Label>
           <Select onValueChange={(v) => handleFormChange('classId', v)} value={formState.classId}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
            <SelectContent>
              {classes.map((cls: Class) => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="teacher" className="text-right">Enseignant</Label>
           <Select onValueChange={(v) => handleFormChange('teacherId', v)} value={formState.teacherId}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
            <SelectContent>
              {teachers.map((teacher: Teacher) => (<SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
         <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="subject" className="text-right">Matière</Label>
          <Input id="subject" value={formState.subject} onChange={(e) => handleFormChange('subject', e.target.value)} className="col-span-3" placeholder="Ex: Mathématiques" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="day" className="text-right">Jour</Label>
           <Select onValueChange={(v) => handleFormChange('day', v)} value={formState.day}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un jour" /></SelectTrigger>
            <SelectContent>
              {daysOfWeek.map(day => (<SelectItem key={day} value={day}>{day}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="startTime" className="text-right">Début</Label>
           <Select onValueChange={(v) => handleFormChange('startTime', v)} value={formState.startTime}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Heure de début" /></SelectTrigger>
            <SelectContent>
              {timeSlots.map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="endTime" className="text-right">Fin</Label>
           <Select onValueChange={(v) => handleFormChange('endTime', v)} value={formState.endTime}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Heure de fin" /></SelectTrigger>
            <SelectContent>
              {timeSlots.map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
  );

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
              {renderForm(false)}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={() => handleSubmitEntry(false)}>Ajouter</Button>
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
                    <TableHead>Jour</TableHead>
                    <TableHead>Heure</TableHead>
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
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : timetableDetails.length > 0 ? (
                  timetableDetails
                  .sort((a,b) => `${a.className}-${daysOfWeek.indexOf(a.day)}-${a.startTime}`.localeCompare(`${b.className}-${daysOfWeek.indexOf(b.day)}-${b.startTime}`))
                  .map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.className}</TableCell>
                      <TableCell>{entry.day}</TableCell>
                      <TableCell className="font-mono">{entry.startTime} - {entry.endTime}</TableCell>
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
                        <TableCell colSpan={6} className="h-24 text-center">Aucune entrée dans l'emploi du temps.</TableCell>
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
          {renderForm(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => handleSubmitEntry(true)}>Enregistrer</Button>
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
