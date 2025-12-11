

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { collection, addDoc, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { class_type as Class, staff as Staff } from '@/lib/data-types';

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

  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // --- Firestore Data Hooks ---
  const timetableQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `emploi_du_temps`), where('schoolId', '==', schoolId)) : null, [firestore, schoolId]);
  const personnelQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `personnel`), where('schoolId', '==', schoolId), where('role', '==', 'Enseignant')) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `classes`), where('schoolId', '==', schoolId)) : null, [firestore, schoolId]);
  
  const { data: timetableData, loading: timetableLoading } = useCollection(timetableQuery);
  const { data: personnelData, loading: personnelLoading } = useCollection(personnelQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const timetable: TimetableEntry[] = useMemo(() => timetableData?.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)) || [], [timetableData]);
  const teachers: (Staff & {id: string})[] = useMemo(() => personnelData?.map(d => ({ id: d.id, ...d.data() } as Staff & {id: string})) || [], [personnelData]);
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
          classId: selectedClassId !== 'all' ? selectedClassId : '',
          teacherId: "",
          subject: "",
          day: "Lundi",
          startTime: "08:00",
          endTime: "09:00",
        });
      }
    }
  }, [isFormOpen, editingEntry, form, selectedClassId]);

  const { timetableGrid, allTimeSlots } = useMemo(() => {
    const grid: { [time: string]: { [day: string]: TimetableEntry[] } } = {};
    const filteredEntries = timetable.filter(entry => selectedClassId === 'all' || entry.classId === selectedClassId);

    const uniqueTimes = new Set<string>();
    filteredEntries.forEach(entry => {
        uniqueTimes.add(entry.startTime);
    });
    // Ensure all base time slots are present
    timeSlots.forEach(slot => uniqueTimes.add(slot));

    const sortedTimes = Array.from(uniqueTimes).sort();

    sortedTimes.forEach(time => {
        grid[time] = {};
        daysOfWeek.forEach(day => {
            grid[time][day] = [];
        });
    });

    filteredEntries.forEach(entry => {
        if (grid[entry.startTime] && grid[entry.startTime][entry.day]) {
            grid[entry.startTime][entry.day].push(entry);
        }
    });

    return { timetableGrid: grid, allTimeSlots: sortedTimes };
}, [timetable, selectedClassId]);


  const getEntryDocRef = (entryId: string) => doc(firestore, `emploi_du_temps/${entryId}`);

  const handleSubmitEntry = (values: TimetableFormValues) => {
    if (!schoolId) {
      toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
      return;
    }
    const dataWithSchoolId = { ...values, schoolId };

    if (editingEntry) {
        const entryDocRef = getEntryDocRef(editingEntry.id);
        setDoc(entryDocRef, dataWithSchoolId, { merge: true })
        .then(() => {
            toast({ title: "Entrée modifiée", description: "L'entrée de l'emploi du temps a été mise à jour." });
            setIsFormOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: entryDocRef.path, operation: 'update', requestResourceData: dataWithSchoolId });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
        const timetableCollectionRef = collection(firestore, `emploi_du_temps`);
        addDoc(timetableCollectionRef, dataWithSchoolId)
        .then(() => {
            toast({ title: "Entrée ajoutée", description: "La nouvelle entrée a été ajoutée à l'emploi du temps." });
            setIsFormOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: timetableCollectionRef.path, operation: 'create', requestResourceData: dataWithSchoolId });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };
  
  const handleOpenFormDialog = (entry: TimetableEntry | null, day?: string, time?: string) => {
    if (entry) {
        setEditingEntry(entry);
    } else if(day && time) {
        setEditingEntry(null);
        const timeIndex = timeSlots.indexOf(time);
        const endTime = timeIndex !== -1 && timeIndex < timeSlots.length -1 ? timeSlots[timeIndex+1] : time;
        form.reset({
            classId: selectedClassId !== 'all' ? selectedClassId : '',
            day: day as TimetableFormValues['day'],
            startTime: time,
            endTime: endTime,
            teacherId: '',
            subject: ''
        })
    } else {
        setEditingEntry(null);
    }
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

  const isLoading = schoolLoading || timetableLoading || personnelLoading || classesLoading;
  
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Emploi du Temps</h1>
            <p className="text-muted-foreground">Vue hebdomadaire des cours par classe.</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrer par classe" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingEntry(null); setIsFormOpen(isOpen); }}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenFormDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingEntry ? "Modifier" : "Ajouter à"} l'Emploi du Temps</DialogTitle>
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
        </div>
        <Card>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full border-collapse">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-24 border text-center font-semibold">Heure</TableHead>
                            {daysOfWeek.map(day => (
                                <TableHead key={day} className="border text-center font-semibold">{day}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell className="border p-2 text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                {daysOfWeek.map(day => (
                                    <TableCell key={day} className="border p-2"><Skeleton className="h-16 w-full" /></TableCell>
                                ))}
                            </TableRow>
                        )) : allTimeSlots.map(time => (
                            <TableRow key={time}>
                                <TableCell className="border p-2 text-center align-middle font-mono text-sm">{time}</TableCell>
                                {daysOfWeek.map(day => (
                                    <TableCell key={day} className="border p-1 align-top h-24 w-40 relative group">
                                        {timetableGrid[time]?.[day]?.map(entry => {
                                            const teacher = teachers.find(t => t.id === entry.teacherId);
                                            const classInfo = classes.find(c => c.id === entry.classId);
                                            return (
                                                <div key={entry.id} className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-xs mb-1 relative">
                                                    <p className="font-bold text-blue-800 dark:text-blue-300">{entry.subject}</p>
                                                    <p className="text-muted-foreground">{teacher ? `${teacher.firstName[0]}. ${teacher.lastName}` : 'N/A'}</p>
                                                    {selectedClassId === 'all' && <p className="text-blue-600 dark:text-blue-400 font-semibold">{classInfo?.name}</p>}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenFormDialog(entry)}>Modifier</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(entry)}>Supprimer</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            );
                                        })}
                                        <Button variant="ghost" size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" onClick={() => handleOpenFormDialog(null, day, time)}>
                                            <PlusCircle className="h-5 w-5 text-muted-foreground" />
                                        </Button>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {!isLoading && allTimeSlots.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        {selectedClassId !== 'all' ? 'Aucun cours programmé pour cette classe.' : 'Aucun cours programmé. Commencez par ajouter une entrée.'}
                    </div>
                 )}
              </div>
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
