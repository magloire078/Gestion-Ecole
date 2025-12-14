
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, MoreHorizontal, Eye, Search, Printer, Upload, Download, FileText, CalendarDays, FileSignature } from "lucide-react";
import { useState, useMemo } from "react";
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
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, increment, query } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useSchoolData } from "@/hooks/use-school-data";
import { differenceInYears, differenceInMonths, addYears } from "date-fns";
import { useHydrationFix } from "@/hooks/use-hydration-fix";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { student as Student, class_type as Class, fee as Fee, niveau as Niveau } from "@/lib/data-types";
import { StudentEditForm } from "@/components/student-edit-form";

const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
        case 'Actif':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'Radié':
            return 'bg-destructive/80 text-destructive-foreground';
        case 'En attente':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default:
            return 'bg-secondary text-secondary-foreground';
    }
};

export default function StudentsPage() {
  const isMounted = useHydrationFix();
  const router = useRouter();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const studentsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const feesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`)) : null, [firestore, schoolId]);
  const niveauxQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  
  const allStudents: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);
  const fees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);
  const niveaux: Niveau[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);


  const [searchTerm, setSearchTerm] = useState("");
  const students = useMemo(() => {
    return allStudents.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allStudents, searchTerm]);


  // Edit Student State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Delete Student State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  
  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!schoolId || !studentToDelete || !studentToDelete.id) return;

    const batch = writeBatch(firestore);
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentToDelete.id}`);
    
    batch.delete(studentDocRef);

    if (studentToDelete.classId) {
        const classDocRef = doc(firestore, `ecoles/${schoolId}/classes/${studentToDelete.classId}`);
        batch.update(classDocRef, { studentCount: increment(-1) });
    }

    try {
        await batch.commit();
        toast({ title: "Élève supprimé", description: `L'élève ${studentToDelete.firstName} ${studentToDelete.lastName} a été supprimé(e).` });
    } catch(serverError) {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH] /ecoles/${schoolId}/eleves/${studentToDelete.id} & /ecoles/${schoolId}/classes/${studentToDelete.classId}`,
            operation: 'write',
            requestResourceData: { studentDeletePath: studentDocRef.path, classUpdatePath: studentToDelete.classId ? `/ecoles/${schoolId}/classes/${studentToDelete.classId}` : 'N/A' }
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleteDialogOpen(false);
        setStudentToDelete(null);
    }
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

  const isLoading = schoolLoading || studentsLoading || classesLoading || feesLoading || niveauxLoading;
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="space-y-6 print:space-y-0" id="students-page">
        <div className="flex justify-between items-center gap-4 print:hidden">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Élèves ({students.length})</h1>
              <p className="text-muted-foreground">Consultez et gérez les élèves inscrits.</p>
            </div>
            <Button onClick={() => router.push('/dashboard/inscription')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Inscription
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 print:hidden">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Chercher par nom ou matricule..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => toast({title: "Bientôt disponible", description: "L'importation de données sera bientôt disponible."})}>
                    <Upload className="mr-2 h-4 w-4" /> Importer
                </Button>
                <Button variant="outline" onClick={() => toast({title: "Bientôt disponible", description: "L'exportation de données sera bientôt disponible."})}>
                    <Download className="mr-2 h-4 w-4" /> Exporter
                </Button>
                 <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimer
                </Button>
            </div>
        </div>
          <Card>
              <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">N°</TableHead>
                        <TableHead>Élève</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Âge</TableHead>
                        <TableHead>Sexe</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead className="text-center">Paiement</TableHead>
                        <TableHead className="text-right print:hidden">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-8"/></TableCell>
                            <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-24"/></div></div></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto"/></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                          </TableRow>
                        ))
                      ) : students.length > 0 ? (
                        students.map((student, index) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 print:hidden">
                                    <AvatarImage src={student.photoUrl || `https://picsum.photos/seed/${student.id}/100`} alt={`${student.firstName} ${student.lastName}`} data-ai-hint="person face" />
                                    <AvatarFallback>{`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline">
                                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                                    </Link>
                                    <div className="text-xs text-muted-foreground font-mono">{student.matricule || student.id?.substring(0,8)}</div>
                                </div>
                            </div>
                          </TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>{isMounted ? getAge(student.dateOfBirth) : <Skeleton className="h-5 w-16"/>}</TableCell>
                          <TableCell>{student.gender?.charAt(0)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("border-transparent", getStatusBadgeVariant(student.status || 'Actif'))}>{student.status || 'Actif'}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                              <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
                          </TableCell>
                          <TableCell className="text-right print:hidden">
                            <div className="flex justify-end gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                   <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}`)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Voir le Profil
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/bulletin`)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Bulletin
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/emploi-du-temps`)}>
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        Emploi du temps
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/fiche`)}>
                                        <FileSignature className="mr-2 h-4 w-4" />
                                        Fiche
                                    </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>Modifier</DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleOpenDeleteDialog(student)}
                                  >
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">Aucun élève trouvé.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
              </CardContent>
          </Card>
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
                Mettez à jour les informations de <strong>{editingStudent?.firstName} {editingStudent?.lastName}</strong>.
            </DialogDescription>
          </DialogHeader>
          {editingStudent && schoolId && (
            <StudentEditForm 
              student={editingStudent} 
              classes={classes}
              fees={fees}
              niveaux={niveaux}
              schoolId={schoolId} 
              onFormSubmit={() => setIsEditDialogOpen(false)} 
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button type="submit" form={`edit-student-form-${editingStudent?.id}`}>
              Enregistrer
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
              Cette action est irréversible. L'élève <strong>{studentToDelete?.firstName} {studentToDelete?.lastName}</strong> sera définitivement supprimé(e). Les données de sa classe seront mises à jour.
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
