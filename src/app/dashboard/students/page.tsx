
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, Bot, Smile, Meh, Frown, MoreHorizontal, Eye, MessageSquare } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useSchoolData } from "@/hooks/use-school-data";
import { differenceInYears, differenceInMonths, addYears } from "date-fns";
import { useHydrationFix } from "@/hooks/use-hydration-fix";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


interface Student {
  id: string;
  matricule?: string;
  name: string;
  class: string;
  classId: string;
  cycle: string;
  feedback: string;
  tuitionStatus: TuitionStatus;
  amountDue: number;
  dateOfBirth: string;
  parent1Name?: string;
  parent1Contact?: string;
}

interface Class {
    id: string;
    name: string;
    cycle: string;
}

type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

const studentSchema = z.object({
    name: z.string().min(1, { message: "Le nom est requis." }),
    classId: z.string().min(1, { message: "La classe est requise." }),
    dateOfBirth: z.string().min(1, { message: "La date de naissance est requise." }),
    amountDue: z.coerce.number().min(0, "Le montant dû ne peut pas être négatif."),
    tuitionStatus: z.enum(['Soldé', 'En retard', 'Partiel']),
    feedback: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;


export default function StudentsPage() {
  const isMounted = useHydrationFix();
  const router = useRouter();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  // Edit Student State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Delete Student State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
        name: '',
        classId: '',
        dateOfBirth: '',
        amountDue: 0,
        tuitionStatus: 'Partiel',
        feedback: '',
    }
  });

  useEffect(() => {
    if(isEditDialogOpen && editingStudent) {
      form.reset({
        name: editingStudent.name,
        classId: editingStudent.classId,
        feedback: editingStudent.feedback,
        amountDue: editingStudent.amountDue,
        tuitionStatus: editingStudent.tuitionStatus,
        dateOfBirth: editingStudent.dateOfBirth,
      });
    } else {
        form.reset();
    }
  }, [editingStudent, isEditDialogOpen, form]);
  
  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleEditStudent = (values: StudentFormValues) => {
    if (!schoolId || !editingStudent) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier l'élève." });
      return;
    }
    
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${editingStudent.id}`);
    const selectedClassInfo = classes.find(c => c.id === values.classId);
    
    const updatedData = {
      name: values.name,
      classId: values.classId,
      class: selectedClassInfo?.name || 'N/A',
      cycle: selectedClassInfo?.cycle || editingStudent.cycle,
      feedback: values.feedback || '',
      amountDue: values.amountDue,
      tuitionStatus: values.tuitionStatus,
      dateOfBirth: values.dateOfBirth,
    };
    
    setDoc(studentDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Élève modifié", description: `Les informations de ${values.name} ont été mises à jour.` });
        setIsEditDialogOpen(false);
        setEditingStudent(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleOpenDeleteDialog = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = () => {
    if (!schoolId || !studentToDelete) return;

    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentToDelete.id}`);
    deleteDoc(studentDocRef)
    .then(() => {
        toast({ title: "Élève supprimé", description: `L'élève ${studentToDelete.name} a été supprimé(e).` });
        setIsDeleteDialogOpen(false);
        setStudentToDelete(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  }
  
  const getAge = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return 'N/A';
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const years = differenceInYears(today, birthDate);
      const monthDate = addYears(birthDate, years);
      const months = differenceInMonths(today, monthDate);
      
      let ageString = `${years} an${years > 1 ? 's' : ''}`;
      if (months > 0) {
        ageString += ` ${months} mois`;
      }
      return ageString;
    } catch {
      return 'N/A';
    }
  }

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  const isLoading = schoolLoading || studentsLoading || classesLoading;
  const { toast } = useToast();

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Élèves ({students.length})</h1>
              <p className="text-muted-foreground">Consultez et gérez les élèves inscrits.</p>
            </div>
            <Button onClick={() => router.push('/dashboard/registration')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Élève
            </Button>
          </div>
          <Card>
              <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">N°</TableHead>
                        <TableHead>Matricule</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Âge</TableHead>
                        <TableHead className="text-right">Solde Scolarité</TableHead>
                        <TableHead className="text-center">Statut Paiement</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-8"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                          </TableRow>
                        ))
                      ) : students.length > 0 ? (
                        students.map((student, index) => (
                        <TableRow key={student.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{student.matricule || student.id.substring(0,8)}</TableCell>
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/students/${student.id}`} className="hover:underline text-primary">
                                {student.name}
                            </Link>
                          </TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>{isMounted ? getAge(student.dateOfBirth) : <Skeleton className="h-5 w-16"/>}</TableCell>
                          <TableCell className="text-right font-mono">
                              {student.amountDue > 0 ? formatCurrency(student.amountDue) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                              <TuitionStatusBadge status={student.tuitionStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/students/${student.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Voir la fiche
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>Modifier</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleOpenDeleteDialog(student)}
                                  >
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">Aucun élève inscrit pour le moment.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) setEditingStudent(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'Élève</DialogTitle>
            <DialogDescription>
                Mettez à jour les informations de <strong>{editingStudent?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form id="edit-student-form" onSubmit={form.handleSubmit(handleEditStudent)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Nom</FormLabel>
                    <FormControl className="col-span-3">
                      <Input {...field} />
                    </FormControl>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Date de naiss.</FormLabel>
                    <FormControl className="col-span-3">
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Classe</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl className="col-span-3">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amountDue"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Solde (CFA)</FormLabel>
                    <FormControl className="col-span-3">
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tuitionStatus"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl className="col-span-3">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Soldé">Soldé</SelectItem>
                        <SelectItem value="En retard">En retard</SelectItem>
                        <SelectItem value="Partiel">Partiel</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-start gap-4">
                    <FormLabel className="text-right pt-2">Feedback</FormLabel>
                    <FormControl className="col-span-3">
                      <Textarea {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button type="submit" form="edit-student-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'élève <strong>{studentToDelete?.name}</strong> sera définitivement supprimé(e).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
