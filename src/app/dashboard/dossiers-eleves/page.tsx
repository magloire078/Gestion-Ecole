

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, MoreHorizontal, Eye, Search, Printer, Upload, Download, FileText, CalendarDays, FileSignature, CreditCard, Edit, Trash2, UserX, UserCheck, Users, School, GraduationCap } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Link from "next/link";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, writeBatch, increment, query } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useSchoolData } from "@/hooks/use-school-data";
import { differenceInYears, differenceInMonths, addYears } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { student as Student, class_type as Class, fee as Fee, niveau as Niveau, cycle as Cycle } from "@/lib/data-types";
import { StudentEditForm } from "@/components/student-edit-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
        case 'Actif':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'En attente':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        case 'Transféré':
        case 'Diplômé':
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        case 'Radié':
            return 'bg-destructive/80 text-destructive-foreground';
        default:
            return 'bg-secondary text-secondary-foreground';
    }
};

const getAge = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return 'N/A';
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const years = differenceInYears(today, birthDate);
      const monthDate = addYears(birthDate, years);
      const months = differenceInMonths(today, dateAfterMonths);
      
      let ageString = `${years} an${years > 1 ? 's' : ''}`;
      if (months > 0) {
        ageString += ` ${months} mois`;
      }
      return ageString;
    } catch {
      return 'N/A';
    }
}

interface StudentsTableProps {
    students: Student[];
    isLoading: boolean;
    canManageUsers: boolean;
    actionType: 'archive' | 'restore';
    onEdit: (student: Student) => void;
    onArchive: (student: Student) => void;
    onRestore: (student: Student) => void;
}

const StudentsTable = ({ students, isLoading, canManageUsers, actionType, onEdit, onArchive, onRestore }: StudentsTableProps) => {
    const router = useRouter();

    return (
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
                        {actionType === 'active' && <TableHead className="text-center">Paiement</TableHead>}
                        <TableHead className="text-right print:hidden">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={8}><Skeleton className="h-5 w-full"/></TableCell>
                                </TableRow>
                            ))
                        ) : students.length > 0 ? (
                            students.map((student, index) => (
                                <TableRow key={student.id}>
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 print:hidden">
                                            <AvatarImage src={student.photoUrl || undefined} alt={`${student.firstName} ${student.lastName}`} data-ai-hint="person face" />
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
                                <TableCell>{getAge(student.dateOfBirth)}</TableCell>
                                <TableCell>{student.gender?.charAt(0)}</TableCell>
                                <TableCell className="text-center">
                                    <Badge className={cn("border-transparent", getStatusBadgeVariant(student.status || 'Actif'))}>{student.status || 'Actif'}</Badge>
                                </TableCell>
                                {actionType === 'active' &&
                                  <TableCell className="text-center">
                                      <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
                                  </TableCell>
                                }
                                <TableCell className="text-right print:hidden">
                                    <div className="flex justify-end gap-1">
                                        {actionType === 'active' && canManageUsers && (
                                            <Button variant="outline" size="sm" onClick={() => onEdit(student)}>
                                                <Edit className="h-3.5 w-3.5 mr-1"/> Modifier
                                            </Button>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" /> Voir le Profil
                                                </DropdownMenuItem>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <Printer className="mr-2 h-4 w-4" /> Imprimer
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                        <DropdownMenuSubContent>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/carte`)}><CreditCard className="mr-2 h-4 w-4" />Carte Étudiant</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/bulletin`)}><FileText className="mr-2 h-4 w-4" />Bulletin</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/emploi-du-temps`)}><CalendarDays className="mr-2 h-4 w-4" />Emploi du temps</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/fiche`)}><FileSignature className="mr-2 h-4 w-4" />Fiche</DropdownMenuItem>
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuPortal>
                                                </DropdownMenuSub>
                                                {canManageUsers && <DropdownMenuSeparator />}
                                                {actionType === 'active' && canManageUsers && (
                                                    <DropdownMenuItem className="text-destructive" onClick={() => onArchive(student)}>
                                                        <UserX className="mr-2 h-4 w-4" /> Radier
                                                    </DropdownMenuItem>
                                                )}
                                                {actionType === 'archived' && canManageUsers && (
                                                    <DropdownMenuItem onClick={() => onRestore(student)}>
                                                        <UserCheck className="mr-2 h-4 w-4" /> Restaurer
                                                    </DropdownMenuItem>
                                                )}
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
    )
}

const StatCard = ({ title, value, icon: Icon, description, loading }: { title: string, value: string | number, icon: React.ElementType, description?: string, loading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
            {description && !loading && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);


export default function StudentsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const feesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`)) : null, [firestore, schoolId]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);
  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  
  const allStudents: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);
  const fees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);
  const niveaux: Niveau[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);
  const cycles: Cycle[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle)) || [], [cyclesData]);


  const [searchTerm, setSearchTerm] = useState("");
  const { activeStudents, archivedStudents } = useMemo(() => {
    const filterBySearch = (studentsToFilter: Student[]) => studentsToFilter.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const active = allStudents.filter(student => ['Actif', 'En attente'].includes(student.status));
    const archived = allStudents.filter(student => !['Actif', 'En attente'].includes(student.status));
    
    return {
        activeStudents: filterBySearch(active),
        archivedStudents: filterBySearch(archived),
    }
  }, [allStudents, searchTerm]);
  
  const stats = useMemo(() => {
    const boys = activeStudents.filter(s => s.gender === 'Masculin').length;
    const girls = activeStudents.filter(s => s.gender === 'Féminin').length;
    return {
        total: activeStudents.length,
        boys,
        girls,
        classes: classes.length,
        cycles: cycles.length
    }
}, [activeStudents, classes, cycles]);


  // Edit Student State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Archive Student State
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [studentToArchive, setStudentToArchive] = useState<Student | null>(null);

  // Restore Student State
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [studentToRestore, setStudentToRestore] = useState<Student | null>(null);
  
  
  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleOpenArchiveDialog = (student: Student) => {
    setStudentToArchive(student);
    setIsArchiveDialogOpen(true);
  };
  
  const handleOpenRestoreDialog = (student: Student) => {
    setStudentToRestore(student);
    setIsRestoreDialogOpen(true);
  }

  const handleArchiveStudent = () => {
    if (!schoolId || !studentToArchive || !studentToArchive.id) return;

    const wasActive = ['Actif', 'En attente'].includes(studentToArchive.status);

    const batch = writeBatch(firestore);
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentToArchive.id}`);
    
    batch.update(studentDocRef, { status: 'Radié' });

    if (wasActive && studentToArchive.classId) {
        const classDocRef = doc(firestore, `ecoles/${schoolId}/classes/${studentToArchive.classId}`);
        batch.update(classDocRef, { studentCount: increment(-1) });
    }

    batch.commit()
    .then(() => {
        toast({ title: "Élève radié", description: `L'élève ${studentToArchive.firstName} ${studentToArchive.lastName} a été marqué(e) comme radié(e).` });
    })
    .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}/eleves/${studentToArchive.id} and class update`,
            operation: 'update'
        });
        errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
        setIsArchiveDialogOpen(false);
        setStudentToArchive(null);
    });
  }

  const handleRestoreStudent = () => {
      if (!schoolId || !studentToRestore || !studentToRestore.id) return;
      const wasArchived = !['Actif', 'En attente'].includes(studentToRestore.status);

      const batch = writeBatch(firestore);
      const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentToRestore.id}`);
      batch.update(studentDocRef, { status: 'Actif' });

      if (wasArchived && studentToRestore.classId) {
          const classDocRef = doc(firestore, `ecoles/${schoolId}/classes/${studentToRestore.classId}`);
          batch.update(classDocRef, { studentCount: increment(1) });
      }

      batch.commit()
          .then(() => {
              toast({ title: "Élève restauré", description: `L'élève ${studentToRestore.firstName} ${studentToRestore.lastName} est de nouveau actif.` });
          })
          .catch((serverError) => {
              const permissionError = new FirestorePermissionError({
                  path: `[BATCH WRITE] /ecoles/${schoolId}/eleves/${studentToRestore.id}`,
                  operation: 'update'
              });
              errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
              setIsRestoreDialogOpen(false);
              setStudentToRestore(null);
          });
  }
  
  const isLoading = schoolLoading || studentsLoading || classesLoading || feesLoading || niveauxLoading || userLoading || cyclesLoading;
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="space-y-6 print:space-y-0" id="students-page">
        <div className="flex justify-between items-center gap-4 print:hidden">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Gestion des Élèves</h1>
              <p className="text-muted-foreground">Consultez, gérez et archivez les dossiers des élèves inscrits.</p>
            </div>
            {canManageUsers && (
              <Button onClick={() => router.push('/dashboard/inscription')}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Inscription
              </Button>
            )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:hidden">
            <StatCard title="Élèves Actifs" value={stats.total} icon={Users} loading={isLoading} />
            <StatCard title="Garçons / Filles" value={`${stats.boys} / ${stats.girls}`} icon={Users} loading={isLoading} />
            <StatCard title="Classes" value={stats.classes} icon={School} loading={isLoading} description={`${classes.length} classes au total.`} />
            <StatCard title="Cycles" value={stats.cycles} icon={GraduationCap} loading={isLoading} description={`${cycles.length} cycles au total.`} />
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
                    <Printer className="mr-2 h-4 w-4" /> Imprimer la liste
                </Button>
            </div>
        </div>
          
        <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">Actifs ({activeStudents.length})</TabsTrigger>
                <TabsTrigger value="archived">Archives ({archivedStudents.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">
                <StudentsTable
                    students={activeStudents}
                    isLoading={isLoading}
                    canManageUsers={canManageUsers}
                    actionType="archive"
                    onEdit={handleOpenEditDialog}
                    onArchive={handleOpenArchiveDialog}
                    onRestore={handleOpenRestoreDialog}
                />
            </TabsContent>
            <TabsContent value="archived" className="mt-4">
                <StudentsTable
                    students={archivedStudents}
                    isLoading={isLoading}
                    canManageUsers={canManageUsers}
                    actionType="archived"
                    onEdit={handleOpenEditDialog}
                    onArchive={handleOpenArchiveDialog}
                    onRestore={handleOpenRestoreDialog}
                />
            </TabsContent>
        </Tabs>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) setEditingStudent(null);
          setIsEditDialogOpen(isOpen);
      }}>
        <DialogContent className="max-w-2xl">
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
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <DialogHeader>
            <AlertDialogTitle>Radier l'élève ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action marquera l'élève <strong>{studentToArchive?.firstName} {studentToArchive?.lastName}</strong> comme "Radié". Il sera déplacé vers les archives mais ses données seront conservées.
            </AlertDialogDescription>
          </DialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveStudent} className="bg-destructive hover:bg-destructive/90">Radier l'élève</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
       <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent>
          <DialogHeader>
            <AlertDialogTitle>Restaurer l'élève ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'élève <strong>{studentToRestore?.firstName} {studentToRestore?.lastName}</strong> retrouvera le statut "Actif" et réapparaîtra dans la liste principale.
            </AlertDialogDescription>
          </DialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreStudent}>Restaurer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
