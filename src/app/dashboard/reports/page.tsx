
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, addDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { allSubjects } from '@/lib/data';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useHydrationFix } from '@/hooks/use-hydration-fix';


// --- Interfaces ---
interface Student {
  id: string;
  name: string;
  classId: string;
  parent1Name?: string;
  parent1Contact?: string;
}
interface Class {
  id: string;
  name: string;
}
interface GradeEntry {
  id: string;
  studentId: string;
  studentName?: string;
  subject: string;
  type: 'Interrogation' | 'Devoir';
  date: string;
  grade: number;
  coefficient: number;
}

// --- Zod Schema for Validation ---
const gradeSchema = z.object({
    studentId: z.string().min(1, { message: "Veuillez sélectionner un élève." }),
    type: z.enum(['Interrogation', 'Devoir']),
    date: z.string().min(1, { message: "La date est requise." }),
    grade: z.coerce.number().min(0, "La note ne peut pas être négative.").max(20, "La note ne peut pas dépasser 20."),
    coefficient: z.coerce.number().min(0.25, "Le coefficient doit être d'au moins 0.25."),
});
type GradeFormValues = z.infer<typeof gradeSchema>;


export default function GradeEntryPage() {
  const isMounted = useHydrationFix();
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // --- Data Fetching ---
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const studentsQuery = useMemoFirebase(() =>
    schoolId && selectedClassId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('classId', '==', selectedClassId)) : null
  , [firestore, schoolId, selectedClassId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const studentsInClass: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

  // --- UI State ---
  const [allGradesForSubject, setAllGradesForSubject] = useState<GradeEntry[]>([]);
  const [isGradesLoading, setIsGradesLoading] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeEntry | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<GradeEntry | null>(null);

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      studentId: '',
      type: 'Devoir',
      date: format(new Date(), 'yyyy-MM-dd'),
      grade: 0,
      coefficient: 1,
    }
  });

  // --- Effects ---
  useEffect(() => {
    setSelectedSubject(null);
    setAllGradesForSubject([]);
  }, [selectedClassId]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedSubject || studentsInClass.length === 0 || !schoolId) {
        setAllGradesForSubject([]);
        return;
      }
      setIsGradesLoading(true);
      
      const allGrades: GradeEntry[] = [];
      for (const student of studentsInClass) {
        const gradesCollectionRef = collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/notes`);
        const q = query(gradesCollectionRef, where('subject', '==', selectedSubject));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          allGrades.push({ 
            id: doc.id,
            studentId: student.id,
            studentName: student.name,
            ...doc.data() 
          } as GradeEntry);
        });
      }
      
      allGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllGradesForSubject(allGrades);
      setIsGradesLoading(false);
    };

    fetchGrades();
  }, [selectedSubject, studentsInClass, schoolId, firestore]);
  
  useEffect(() => {
    if (isFormOpen) {
        if (editingGrade) {
            form.reset({
                studentId: editingGrade.studentId,
                type: editingGrade.type,
                grade: editingGrade.grade,
                coefficient: editingGrade.coefficient,
                date: editingGrade.date,
            });
        } else {
            form.reset({
                studentId: '',
                type: 'Devoir',
                date: format(new Date(), 'yyyy-MM-dd'),
                grade: 0,
                coefficient: 1,
            });
        }
    }
  }, [isFormOpen, editingGrade, form]);


  const handleOpenFormDialog = (grade: GradeEntry | null) => {
    setEditingGrade(grade);
    setIsFormOpen(true);
  };
  
  const handleSubmitGrade = async (values: GradeFormValues) => {
    if (!schoolId || !selectedSubject) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner une classe et une matière.' });
      return;
    }
    
    const gradeData = {
      subject: selectedSubject,
      type: values.type,
      date: values.date,
      grade: values.grade,
      coefficient: values.coefficient,
    };
    
    try {
        if (editingGrade) {
            // Update
            const gradeRef = doc(firestore, `ecoles/${schoolId}/eleves/${editingGrade.studentId}/notes/${editingGrade.id}`);
            await setDoc(gradeRef, gradeData);
            toast({ title: 'Note modifiée', description: `La note a été mise à jour.` });
            setAllGradesForSubject(prev => prev.map(g => g.id === editingGrade.id ? { ...g, ...gradeData } : g));
        } else {
            // Create
            const gradesCollectionRef = collection(firestore, `ecoles/${schoolId}/eleves/${values.studentId}/notes`);
            const newDocRef = await addDoc(gradesCollectionRef, gradeData);
            
            const student = studentsInClass.find(s => s.id === values.studentId);
            const parentName = student?.parent1Name || 'Parent';

            toast({ 
                title: 'Note ajoutée avec succès !', 
                description: `La note a été enregistrée et une notification a été envoyée à ${parentName}.`
            });
            
            setAllGradesForSubject(prev => [{ ...gradeData, id: newDocRef.id, studentId: values.studentId, studentName: student?.name || '' }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      setIsFormOpen(false);
    } catch(error) {
      const operation = editingGrade ? 'update' : 'create';
      const studentIdForPath = editingGrade ? editingGrade.studentId : values.studentId;
      const path = editingGrade 
        ? `ecoles/${schoolId}/eleves/${studentIdForPath}/notes/${editingGrade.id}`
        : `ecoles/${schoolId}/eleves/${studentIdForPath}/notes`;

      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: gradeData });
      errorEmitter.emit('permission-error', permissionError);
    }
  }

  const handleOpenDeleteDialog = (grade: GradeEntry) => {
    setGradeToDelete(grade);
    setIsDeleting(true);
  };
  
  const handleDeleteGrade = async () => {
    if (!schoolId || !gradeToDelete) return;
    try {
        const gradeRef = doc(firestore, `ecoles/${schoolId}/eleves/${gradeToDelete.studentId}/notes/${gradeToDelete.id}`);
        await deleteDoc(gradeRef);
        toast({ title: 'Note supprimée', description: 'La note a été supprimée.' });
        setAllGradesForSubject(prev => prev.filter(g => g.id !== gradeToDelete.id));
        setIsDeleting(false);
        setGradeToDelete(null);
    } catch(error) {
         const permissionError = new FirestorePermissionError({ 
             path: `ecoles/${schoolId}/eleves/${gradeToDelete.studentId}/notes/${gradeToDelete.id}`, 
             operation: 'delete' 
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };


  const isLoading = schoolLoading || classesLoading;
  const isDataLoading = studentsLoading || isGradesLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Saisie des Notes</h1>
            <p className="text-muted-foreground">
              Saisissez et gérez les notes des élèves par classe et par matière.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select onValueChange={setSelectedClassId} disabled={isLoading}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner une classe"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedSubject} value={selectedSubject || ''} disabled={!selectedClassId}>
               <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {allSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedClassId && selectedSubject ? (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <CardTitle>
                    Notes de {classes.find(c => c.id === selectedClassId)?.name} en {selectedSubject}
                  </CardTitle>
                  <CardDescription>
                    Liste de toutes les notes enregistrées pour cette matière.
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenFormDialog(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Note /20</TableHead>
                    <TableHead>Coeff.</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDataLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : allGradesForSubject.length > 0 ? (
                    allGradesForSubject.map(grade => (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">{grade.studentName}</TableCell>
                        <TableCell>{isMounted ? format(new Date(grade.date), 'd MMM yyyy', { locale: fr }) : <Skeleton className="h-5 w-24" />}</TableCell>
                        <TableCell>{grade.type}</TableCell>
                        <TableCell className="font-mono">{grade.grade}</TableCell>
                        <TableCell className="font-mono">{grade.coefficient}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenFormDialog(grade)}>
                             <Pencil className="h-4 w-4" />
                          </Button>
                           <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleOpenDeleteDialog(grade)}>
                             <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Aucune note n'a été saisie pour cette matière.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
            <Card className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Veuillez sélectionner une classe et une matière pour commencer.</p>
            </Card>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingGrade ? 'Modifier' : 'Ajouter'} une note</DialogTitle>
                <DialogDescription>Matière: {selectedSubject}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form id="grade-form" onSubmit={form.handleSubmit(handleSubmitGrade)} className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Élève</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!editingGrade}>
                          <FormControl className="col-span-3">
                            <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {studentsInClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl className="col-span-3">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="Devoir">Devoir</SelectItem>
                              <SelectItem value="Interrogation">Interrogation</SelectItem>
                          </SelectContent>
                        </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Date</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Note /20</FormLabel>
                       <FormControl className="col-span-3">
                        <Input type="number" placeholder="Ex: 15.5" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coefficient"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Coefficient</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="number" placeholder="Ex: 2" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" form="grade-form" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La note sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGrade} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    