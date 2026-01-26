
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
import { PlusCircle, Upload, Download, Printer, Search, Users, School, GraduationCap, LayoutGrid, List } from "lucide-react";
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
import { collection, doc, query } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useSchoolData } from "@/hooks/use-school-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { student as Student, class_type as Class, fee as Fee, niveau as Niveau, cycle as Cycle } from "@/lib/data-types";
import { StudentEditForm } from "@/components/student-edit-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentsTable } from '@/components/dossiers/students-table';
import { StudentsGrid } from '@/components/dossiers/students-grid';
import { StudentsStatsCards } from '@/components/dossiers/stats-cards';
import { archiveStudent, restoreStudent } from "@/services/student-services";


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
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { activeStudents, archivedStudents, filteredActiveStudents } = useMemo(() => {
    const filteredBySearch = allStudents.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredByClass = selectedClass === 'all'
        ? filteredBySearch
        : filteredBySearch.filter(student => student.classId === selectedClass);
        
    const active = filteredByClass.filter(student => ['Actif', 'En attente'].includes(student.status));
    const archived = filteredByClass.filter(student => !['Actif', 'En attente'].includes(student.status));

    return {
        activeStudents: allStudents.filter(student => ['Actif', 'En attente'].includes(student.status)),
        archivedStudents: archived,
        filteredActiveStudents: active,
    }
  }, [allStudents, searchTerm, selectedClass]);
  
  const studentsToShow = selectedStatus === 'active' ? filteredActiveStudents : archivedStudents;
  
  const stats = useMemo(() => {
    const listToUse = searchTerm || selectedClass !== 'all' ? filteredActiveStudents : activeStudents;
    const boys = listToUse.filter(s => s.gender === 'Masculin').length;
    const girls = listToUse.filter(s => s.gender === 'Féminin').length;
    return {
        total: listToUse.length,
        boys,
        girls,
        classes: classes.length,
        cycles: cycles.length
    }
}, [activeStudents, filteredActiveStudents, classes, cycles, searchTerm, selectedClass]);


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
    if (!schoolId || !studentToArchive) return;
    
    archiveStudent(firestore, schoolId, studentToArchive)
    .then(() => {
        toast({ title: "Élève radié", description: `L'élève ${studentToArchive.firstName} ${studentToArchive.lastName} a été marqué(e) comme radié(e).` });
    })
    .catch((error) => {
        console.error("Failed to archive student from component:", error);
    })
    .finally(() => {
        setIsArchiveDialogOpen(false);
        setStudentToArchive(null);
    });
  }

  const handleRestoreStudent = () => {
      if (!schoolId || !studentToRestore) return;
      
      restoreStudent(firestore, schoolId, studentToRestore)
          .then(() => {
              toast({ title: "Élève restauré", description: `L'élève ${studentToRestore.firstName} ${studentToRestore.lastName} est de nouveau actif.` });
          })
          .catch((error) => {
              console.error("Failed to restore student from component:", error);
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

        <StudentsStatsCards stats={stats} isLoading={isLoading} />

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
             <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrer par classe..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2 ml-auto">
                 <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={cn(viewMode === 'list' && 'bg-accent')}>
                    <List className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={cn(viewMode === 'grid' && 'bg-accent')}>
                    <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimer la liste
                </Button>
            </div>
        </div>
          
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">Actifs ({filteredActiveStudents.length})</TabsTrigger>
                <TabsTrigger value="archived">Archives ({archivedStudents.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">
                {viewMode === 'list' ? (
                     <StudentsTable
                        students={studentsToShow}
                        isLoading={isLoading}
                        canManageUsers={canManageUsers}
                        actionType="active"
                        onEdit={handleOpenEditDialog}
                        onArchive={handleOpenArchiveDialog}
                        onRestore={handleOpenRestoreDialog}
                    />
                ) : (
                    <StudentsGrid
                        students={studentsToShow}
                        isLoading={isLoading}
                        actionType="active"
                        onEdit={handleOpenEditDialog}
                        onArchive={handleOpenArchiveDialog}
                        onRestore={handleOpenRestoreDialog}
                    />
                )}
            </TabsContent>
            <TabsContent value="archived" className="mt-4">
                 {viewMode === 'list' ? (
                     <StudentsTable
                        students={studentsToShow}
                        isLoading={isLoading}
                        canManageUsers={canManageUsers}
                        actionType="archived"
                        onEdit={handleOpenEditDialog}
                        onArchive={handleOpenArchiveDialog}
                        onRestore={handleOpenRestoreDialog}
                    />
                 ) : (
                    <StudentsGrid
                        students={studentsToShow}
                        isLoading={isLoading}
                        actionType="archived"
                        onEdit={handleOpenEditDialog}
                        onArchive={handleOpenArchiveDialog}
                        onRestore={handleOpenRestoreDialog}
                    />
                 )}
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
