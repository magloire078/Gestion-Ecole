
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { collection, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { UserX } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { class_type as Class, student as Student, absence as Absence } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const [isMounted, setIsMounted] = useState(false);
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [todayDateString, setTodayDateString] = useState('');

  useEffect(() => {
    setIsMounted(true);
    setTodayDateString(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  // --- Data Fetching ---
  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const studentsQuery = useMemoFirebase(() => 
    schoolId && selectedClassId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('schoolId', '==', schoolId), where('classId', '==', selectedClassId)) : null,
    [firestore, schoolId, selectedClassId]
  );
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const studentsInClass: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  
  const allAbsencesQuery = useMemoFirebase(() =>
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/absences`), where('schoolId', '==', schoolId), orderBy('date', 'desc')) : null
  , [firestore, schoolId]);
  const { data: allAbsencesData, loading: allAbsencesLoading } = useCollection(allAbsencesQuery);

  // --- Derived Data ---
  const { todayAbsences, historicAbsences } = useMemo(() => {
    const today = todayDateString;
    const absences = allAbsencesData?.map(d => ({ id: d.id, ...d.data() } as Absence & {id: string})) || [];
    
    const todayList: (Absence & { id: string })[] = [];
    const historyList: (Absence & { id: string })[] = [];

    for (const absence of absences) {
        historyList.push(absence);
        if (absence.date === today) {
            todayList.push(absence);
        }
    }
    return { todayAbsences: todayList, historicAbsences: historyList };
  }, [allAbsencesData, todayDateString]);


  const studentsWithAbsenceStatus = useMemo<StudentWithAbsence[]>(() => {
      if (!isMounted) return studentsInClass.map(s => ({...s, isAbsentToday: false}));
      const absentStudentIds = new Set(todayAbsences.map(absence => absence.studentId));
      return studentsInClass.map(student => ({
          ...student,
          isAbsentToday: absentStudentIds.has(student.id!)
      }));
  }, [studentsInClass, todayAbsences, isMounted]);


  const form = useForm<AbsenceFormValues>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      date: '', // Initialize as empty, will be set by useEffect
      type: "Journée entière",
      justified: false,
      reason: "",
    }
  });

  useEffect(() => {
      if (todayDateString) {
          form.reset({
              ...form.getValues(),
              date: todayDateString,
          });
      }
  }, [todayDateString, form]);

  const handleOpenForm = (student: Student) => {
    setSelectedStudent(student);
    form.reset({
      studentId: student.id,
      date: todayDateString,
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
      schoolId,
      studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
      classId: selectedStudent.classId,
      recordedBy: user.uid,
      createdAt: serverTimestamp(),
    };
    
    const absenceCollectionRef = collection(firestore, `ecoles/${schoolId}/absences`);
    addDoc(absenceCollectionRef, absenceData)
    .then(() => {
        toast({
            title: "Absence enregistrée",
            description: `L'absence de ${selectedStudent.firstName} a été enregistrée.`,
        });
        setIsFormOpen(false);
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: absenceCollectionRef.path,
            operation: 'create',
            requestResourceData: absenceData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const isLoading = schoolLoading || classesLoading;
  const isDataLoading = studentsLoading || allAbsencesLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion des Absences</h1>
            <p className="text-muted-foreground">Enregistrez et consultez les absences des élèves.</p>
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

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">Saisie du jour</TabsTrigger>
            <TabsTrigger value="history">Historique des absences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today">
             {selectedClassId ? (
              <Card>
                <CardHeader>
                  <CardTitle>Liste des Élèves - {classes.find(c => c.id === selectedClassId)?.name}</CardTitle>
                  <CardDescription>Cliquez sur un élève pour enregistrer une absence pour aujourd'hui ({isMounted ? format(new Date(), 'd MMMM', {locale: fr}) : '...'}).</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom de l'Élève</TableHead>
                        <TableHead className="text-center">Statut du Jour</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDataLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : studentsWithAbsenceStatus.length > 0 ? (
                        studentsWithAbsenceStatus.map(student => (
                          <TableRow 
                            key={student.id} 
                            onClick={() => !student.isAbsentToday && handleOpenForm(student)}
                            className={cn(
                                !student.isAbsentToday && 'cursor-pointer hover:bg-muted/50',
                                student.isAbsentToday && 'bg-red-50/50 dark:bg-red-900/20 text-muted-foreground'
                            )}
                          >
                            <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                            <TableCell className="text-center">
                              {student.isAbsentToday ? (
                                <Badge variant="destructive">Absent(e)</Badge>
                              ) : (
                                <Badge variant="secondary">Présent(e)</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center h-24">Aucun élève trouvé dans cette classe.</TableCell>
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
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                  <CardTitle>Historique des Absences</CardTitle>
                  <CardDescription>Liste de toutes les absences enregistrées.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                   <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Élève</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Motif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {isDataLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          </TableRow>
                        ))
                      ) : historicAbsences.length > 0 ? (
                        historicAbsences.map(absence => (
                          <TableRow key={absence.id}>
                            <TableCell>{isMounted ? format(new Date(absence.date), 'd MMM yyyy', { locale: fr }) : '...'}</TableCell>
                            <TableCell>{absence.studentName}</TableCell>
                            <TableCell>{absence.type}</TableCell>
                            <TableCell>
                                <Badge variant={absence.justified ? 'secondary' : 'destructive'}>
                                    {absence.justified ? 'Justifiée' : 'Non justifiée'}
                                </Badge>
                            </TableCell>
                            <TableCell>{absence.reason}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                           <TableCell colSpan={5} className="text-center h-24">Aucune absence enregistrée pour le moment.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
              <span className="flex items-center gap-2">{form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    