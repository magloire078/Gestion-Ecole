
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, UserX } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { class_type as Class, student as Student, absence as Absence } from '@/lib/data-types';

interface StudentWithAbsence extends Student {
    isAbsentToday?: boolean;
}

const absenceSchema = z.object({
  studentId: z.string().min(1, { message: "Veuillez sélectionner un élève." }),
  date: z.string().min(1, { message: "La date est requise." }),
  type: z.enum(["Journée entière", "Matin", "Après-midi"], { required_error: "Le type d'absence est requis." }),
  justified: z.boolean().default(false),
  reason: z.string().optional(),
});
type AbsenceFormValues = z.infer<typeof absenceSchema>;

export default function AbsencesPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Data Fetching
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const studentsQuery = useMemoFirebase(() => 
    schoolId && selectedClassId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('classId', '==', selectedClassId)) : null,
    [firestore, schoolId, selectedClassId]
  );
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const studentsInClass: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const absencesQuery = useMemoFirebase(() =>
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/absences`), where('date', '==', today)) : null
  , [firestore, schoolId, today]);
  const { data: todayAbsencesData, loading: absencesLoading } = useCollection(absencesQuery);
  const todayAbsences = useMemo(() => todayAbsencesData?.map(d => d.data() as Absence) || [], [todayAbsencesData]);

  const studentsWithAbsenceStatus = useMemo<StudentWithAbsence[]>(() => {
      return studentsInClass.map(student => ({
          ...student,
          isAbsentToday: todayAbsences.some(absence => absence.studentId === student.id)
      }));
  }, [studentsInClass, todayAbsences]);


  const form = useForm<AbsenceFormValues>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      type: "Journée entière",
      justified: false,
      reason: "",
    }
  });

  const handleOpenForm = (student: Student) => {
    setSelectedStudent(student);
    form.reset({
      studentId: student.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      type: "Journée entière",
      justified: false,
      reason: "",
    });
    setIsFormOpen(true);
  };

  const handleSubmitAbsence = async (values: AbsenceFormValues) => {
    if (!schoolId || !user || !selectedStudent) return;

    const absenceData = {
      ...values,
      studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
      classId: selectedStudent.classId,
      recordedBy: user.uid,
      createdAt: serverTimestamp(),
    };
    
    try {
        await addDoc(collection(firestore, `ecoles/${schoolId}/absences`), absenceData);
        toast({
            title: "Absence enregistrée",
            description: `L'absence de ${selectedStudent.firstName} a été enregistrée.`,
        });
        setIsFormOpen(false);
    } catch(error) {
        const permissionError = new FirestorePermissionError({
            path: `ecoles/${schoolId}/absences`,
            operation: 'create',
            requestResourceData: absenceData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  if (isAuthLoading) return <AuthProtectionLoader />;

  const isLoading = schoolLoading || classesLoading;
  const isDataLoading = studentsLoading || absencesLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion des Absences</h1>
            <p className="text-muted-foreground">Enregistrez les absences des élèves par classe.</p>
          </div>
          <div className="w-full md:w-auto">
            <Select onValueChange={setSelectedClassId} disabled={isLoading}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner une classe"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedClassId ? (
          <Card>
            <CardHeader>
              <CardTitle>Liste des Élèves - {classes.find(c => c.id === selectedClassId)?.name}</CardTitle>
              <CardDescription>Cliquez sur un élève pour enregistrer une absence pour aujourd'hui.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'Élève</TableHead>
                    <TableHead className="text-center">Statut du Jour</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDataLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : studentsWithAbsenceStatus.length > 0 ? (
                    studentsWithAbsenceStatus.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                        <TableCell className="text-center">
                          {student.isAbsentToday ? (
                            <span className="text-destructive font-semibold">Absent(e)</span>
                          ) : (
                            <span className="text-emerald-600">Présent(e)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenForm(student)} disabled={student.isAbsentToday}>
                            <UserX className="mr-2 h-4 w-4" /> Marquer Absent(e)
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">Aucun élève trouvé dans cette classe.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Veuillez sélectionner une classe pour voir les élèves.</p>
          </Card>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une absence pour {selectedStudent?.firstName} {selectedStudent?.lastName}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="absence-form" onSubmit={form.handleSubmit(handleSubmitAbsence)} className="grid gap-4 py-4">
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'absence</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Journée entière" id="t1" /></FormControl><FormLabel htmlFor="t1" className="font-normal">Journée</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Matin" id="t2" /></FormControl><FormLabel htmlFor="t2" className="font-normal">Matin</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Après-midi" id="t3" /></FormControl><FormLabel htmlFor="t3" className="font-normal">Après-midi</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="justified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel>Absence justifiée</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Motif (si justifiée)</FormLabel><FormControl><Input placeholder="Ex: Rendez-vous médical" {...field} /></FormControl></FormItem>)} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="absence-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}