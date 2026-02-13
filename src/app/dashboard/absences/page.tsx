
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
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { class_type as Class, student as Student, absence as Absence } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { AbsenceForm } from '@/components/absences/absence-form';
import { AbsencesService } from '@/services/absences-service';
import { useAbsences } from '@/hooks/use-absences';

interface StudentWithAbsence extends Student {
  isAbsentToday?: boolean;
}

export default function AbsencesPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { user } = useUser();
  const { toast } = useToast();

  const canManageAbsences = !!user?.profile?.permissions?.manageAttendance;

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [todayDateString, setTodayDateString] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<(Absence & { id: string }) | null>(null);


  useEffect(() => {
    // Set date only on client to avoid hydration mismatch
    setTodayDateString(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  // --- Data Fetching ---
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const studentsQuery = useMemo(() =>
    schoolId && selectedClassId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('classId', '==', selectedClassId)) : null,
    [firestore, schoolId, selectedClassId]
  );
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const studentsInClass: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

  const thirtyDaysAgo = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);

  // Use new hook for absences
  const { absences: allAbsences, loading: allAbsencesLoading } = useAbsences(schoolId, thirtyDaysAgo);

  // --- Derived Data ---

  // All today's absences, used to calculate presence status for the roll call view
  const todayAbsences = useMemo(() => {
    if (!todayDateString || !allAbsences) return [];
    return allAbsences.filter(absence => absence.date === todayDateString);
  }, [allAbsences, todayDateString]);

  // Historic absences, filtered by the selected class ID
  const historicAbsences = useMemo(() => {
    if (!allAbsences) return [];

    const filtered = selectedClassId
      ? allAbsences.filter(absence => absence.classId === selectedClassId)
      : allAbsences;

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAbsences, selectedClassId]);

  const studentsWithAbsenceStatus = useMemo<StudentWithAbsence[]>(() => {
    if (!todayDateString) return studentsInClass;
    const absentStudentIds = new Set(todayAbsences.map(absence => absence.studentId));
    return studentsInClass.map(student => ({
      ...student,
      isAbsentToday: absentStudentIds.has(student.id!)
    }));
  }, [studentsInClass, todayAbsences, todayDateString]);

  const handleOpenForm = (student: Student) => {
    if (!canManageAbsences) return;
    setSelectedStudent(student);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (absence: Absence & { id: string }) => {
    setAbsenceToDelete(absence);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAbsence = async () => {
    if (!schoolId || !absenceToDelete || !absenceToDelete.studentId) return;

    try {
      await AbsencesService.deleteAbsence(schoolId, absenceToDelete.studentId, absenceToDelete.id);
      toast({ title: 'Absence supprimée', description: "L'enregistrement de l'absence a été supprimé." });
    } catch (e) {
      console.error("Failed to delete absence: ", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'absence. Vérifiez vos permissions et réessayer.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setAbsenceToDelete(null);
    }
  }


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
            <Select onValueChange={(value) => setSelectedClassId(value === 'all' ? null : value)} disabled={isLoading}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder={isLoading ? "Chargement..." : "Filtrer par classe"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map(cls => <SelectItem key={cls.id} value={cls.id!}>{cls.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">Saisie du jour</TabsTrigger>
            <TabsTrigger value="history">Historique (30 derniers jours)</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6">
            {selectedClassId ? (
              <Card>
                <CardHeader>
                  <CardTitle>Liste des Élèves - {classes.find(c => c.id === selectedClassId)?.name}</CardTitle>
                  <CardDescription>
                    {canManageAbsences
                      ? `Cliquez sur un élève pour enregistrer une absence pour aujourd&apos;hui (${todayDateString ? format(new Date(todayDateString), 'd MMMM', { locale: fr }) : ''}).`
                      : "Vue en lecture seule. Vous n&apos;avez pas la permission d'enregistrer des absences."
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom de l&apos;Élève</TableHead>
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
                              canManageAbsences && !student.isAbsentToday && 'cursor-pointer hover:bg-muted/50',
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

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Absences</CardTitle>
                <CardDescription>
                  {selectedClassId ? `Liste des absences pour la classe ${classes.find(c => c.id === selectedClassId)?.name}.` : "Liste de toutes les absences enregistrées."}
                </CardDescription>
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
                      {canManageAbsences && <TableHead className="text-right">Actions</TableHead>}
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
                          {canManageAbsences && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                        </TableRow>
                      ))
                    ) : historicAbsences.length > 0 ? (
                      historicAbsences.map(absence => (
                        <TableRow key={absence.id}>
                          <TableCell>{format(new Date(absence.date), 'd MMM yyyy', { locale: fr })}</TableCell>
                          <TableCell>{absence.studentName}</TableCell>
                          <TableCell>{absence.type}</TableCell>
                          <TableCell>
                            <Badge variant={absence.justified ? 'secondary' : 'destructive'}>
                              {absence.justified ? 'Justifiée' : 'Non justifiée'}
                            </Badge>
                          </TableCell>
                          <TableCell>{absence.reason}</TableCell>
                          {canManageAbsences && (
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(absence)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={canManageAbsences ? 6 : 5} className="text-center h-24">Aucune absence enregistrée pour cette sélection.</TableCell>
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
          <AbsenceForm
            schoolId={schoolId!}
            student={selectedStudent}
            onSave={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L&apos;absence de <strong>{absenceToDelete?.studentName}</strong> du <strong>{absenceToDelete && format(new Date(absenceToDelete.date), 'dd/MM/yyyy')}</strong> sera supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAbsence} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

