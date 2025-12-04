
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
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { class_type as Class, teacher as Teacher } from '@/lib/data-types';

const timetableSchema = z.object({
  classId: z.string().min(1, { message: "La classe est requise." }),
  teacherId: z.string().min(1, { message: "L'enseignant est requis." }),
  subject: z.string().min(1, { message: "La matière est requise." }),
  day: z.enum(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']),
  startTime: z.string().min(1, { message: "L'heure de début est requise." }),
  endTime: z.string().min(1, { message: "L'heure de fin est requise." }),
});

type TimetableFormValues = z.infer<typeof timetableSchema>;


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
  const teachers: (Teacher & {id: string})[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Teacher & {id: string})) || [], [teachersData]);
  const classes: (Class & {id: string})[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class & {id: string})) || [], [classesData]);

  // --- UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntry | null>(null);
  
  const form = useForm<TimetableFormValues>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      classId: "",
      teacherId: "",
      subject: "",
      day: "Lundi",
      startTime: "08:00",
      endTime: "09:00",
    },
  });

  useEffect(() => {
    if (isFormOpen) {
      if (editingEntry) {
        form.reset({
          classId: editingEntry.classId,
          teacherId: editingEntry.teacherId,
          subject: editingEntry.subject,
          day: editingEntry.day,
          startTime: editingEntry.startTime,
          endTime: editingEntry.endTime,
        });
      } else {
        form.reset({
          classId: "",
          teacherId: "",
          subject: "",
          day: "Lundi",
          startTime: "08:00",
          endTime: "09:00",
        });
      }
    }
  }, [isFormOpen, editingEntry, form]);

  const timetableDetails = useMemo(() => {
    return timetable.map(entry => {
      const classInfo = classes.find(c => c.id === entry.classId);
      const teacherInfo = teachers.find(t => t.id === entry.teacherId);
      return {
        ...entry,
        className: classInfo?.name || 'N/A',
        teacherName: teacherInfo ? `${teacherInfo.firstName} ${teacherInfo.lastName}` : 'N/A',
      };
    });
  }, [timetable, classes, teachers]);

  const getEntryDocRef = (entryId: string) => doc(firestore, `ecoles/${schoolId}/emploi_du_temps/${entryId}`);

  const handleSubmitEntry = (values: TimetableFormValues) => {
    if (!schoolId) {
      toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
      return;
    }

    if (editingEntry) {
        // Edit
        const entryDocRef = getEntryDocRef(editingEntry.id);
        setDoc(entryDocRef, values, { merge: true })
        .then(() => {
            toast({ title: "Entrée modifiée", description: "L'entrée de l'emploi du temps a été mise à jour." });
            setIsFormOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: entryDocRef.path, operation: 'update', requestResourceData: values });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
        // Add
        const timetableCollectionRef = collection(firestore, `ecoles/${schoolId}/emploi_du_temps`);
        addDoc(timetableCollectionRef, values)
        .then(() => {
            toast({ title: "Entrée ajoutée", description: "La nouvelle entrée a été ajoutée à l'emploi du temps." });
            setIsFormOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: timetableCollectionRef.path, operation: 'create', requestResourceData: values });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };
  
  const handleOpenFormDialog = (entry: TimetableEntry | null) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
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
  
  const renderForm = () => (
      <Form {...form}>
        <form id="timetable-form" onSubmit={form.handleSubmit(handleSubmitEntry)} className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="classId"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Classe</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className="col-span-3">
                    <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {classes.map((cls) => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage className="col-start-2 col-span-3" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Enseignant</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className="col-span-3">
                    <SelectTrigger><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teachers.map((teacher) => (<SelectItem key={teacher.id} value={teacher.id}>{`${teacher.firstName} ${teacher.lastName}`}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage className="col-start-2 col-span-3" />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Matière</FormLabel>
                <FormControl className="col-span-3">
                  <Input placeholder="Ex: Mathématiques" {...field} />
                </FormControl>
                <FormMessage className="col-start-2 col-span-3" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="day"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Jour</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className="col-span-3">
                    <SelectTrigger><SelectValue placeholder="Sélectionner un jour" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {daysOfWeek.map(day => (<SelectItem key={day} value={day}>{day}</SelectItem>))}
                  </SelectContent>
                </Select>
                 <FormMessage className="col-start-2 col-span-3" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Début</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="col-span-3">
                      <SelectTrigger><SelectValue placeholder="Heure de début" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                    </SelectContent>
                  </Select>
                 <FormMessage className="col-start-2 col-span-3" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Fin</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="col-span-3">
                      <SelectTrigger><SelectValue placeholder="Heure de fin" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                    </SelectContent>
                  </Select>
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Emploi du Temps</h1>
            <p className="text-muted-foreground">Consultez et gérez les attributions des enseignants par classe et par matière.</p>
          </div>
           <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
               if(!isOpen) setEditingEntry(null);
               setIsFormOpen(isOpen);
           }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenFormDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Entrée</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Modifier" : "Ajouter à"} l'Emploi du Temps</DialogTitle>
                <DialogDescription>
                  {editingEntry ? "Mettez à jour les informations de cette entrée." : "Sélectionnez une classe, un enseignant et une matière."}
                </DialogDescription>
              </DialogHeader>
              {renderForm()}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" form="timetable-form" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
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
                            <DropdownMenuItem onClick={() => handleOpenFormDialog(entry)}>Modifier</DropdownMenuItem>
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

    