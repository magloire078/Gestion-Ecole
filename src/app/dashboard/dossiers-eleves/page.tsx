
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
import { StudentService } from "@/services/student-services";
import { useStudents } from "@/hooks/use-students";


export default function StudentsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  // Use new hooks for data fetching
  const { students: allStudents, loading: studentsLoading } = useStudents(schoolId);

  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const feesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`)) : null, [firestore, schoolId]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);
  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [firestore, schoolId]);

  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);

  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);
  const fees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);
  const niveaux: Niveau[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);
  const cycles: Cycle[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as unknown as Cycle)) || [], [cyclesData]);

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

    StudentService.archiveStudent(schoolId, studentToArchive)
      .then(() => {
        toast({ title: "Élève radié", description: `L'élève ${studentToArchive.firstName} ${studentToArchive.lastName} a été marqué(e) comme radié(e).` });
      })
      .catch((error) => {
        console.error("Failed to archive student from component:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de radier l'élève." });
      })
      .finally(() => {
        setIsArchiveDialogOpen(false);
        setStudentToArchive(null);
      });
  }

  const handleRestoreStudent = () => {
    if (!schoolId || !studentToRestore) return;

    StudentService.restoreStudent(schoolId, studentToRestore)
      .then(() => {
        toast({ title: "Élève restauré", description: `L'élève ${studentToRestore.firstName} ${studentToRestore.lastName} est de nouveau actif.` });
      })
      .catch((error) => {
        console.error("Failed to restore student from component:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de restaurer l'élève." });
      })
      .finally(() => {
        setIsRestoreDialogOpen(false);
        setStudentToRestore(null);
      });
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState('all');

  const handlePrint = () => {
    window.print();
  };

  const loading = schoolLoading || studentsLoading || classesLoading || feesLoading || niveauxLoading || userLoading || cyclesLoading;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">
               Pédagogie
             </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
            Dossiers Élèves
          </h1>
          <p className="text-slate-500 max-w-2xl text-sm font-medium">
            Gestion centrale des effectifs : inscriptions, suivi pédagogique et informations personnelles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="rounded-xl border-slate-200 hover:bg-slate-50 transition-all font-semibold"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimer Liste
          </Button>
          {canManageUsers && (
            <Button 
              onClick={() => router.push('/dashboard/inscription')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-1 rounded-xl px-6 font-bold"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Inscrire un Élève
            </Button>
          )}
        </div>
      </div>

      <StudentsStatsCards stats={stats} isLoading={loading} />

      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/40 dark:border-slate-800/40 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Recherche rapide</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Nom, matricule ou classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-2xl focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
        <div className="w-full md:w-[200px] space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrer par Cycle</label>
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="h-12 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-2xl focus:ring-indigo-500">
              <SelectValue placeholder="Tous les cycles" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-white/40">
              <SelectItem value="all">Tous les cycles</SelectItem>
              {cycles.map(cycle => (
                <SelectItem key={cycle.id!} value={cycle.id!}>{cycle.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[200px] space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrer par Classe</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-12 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-2xl focus:ring-indigo-500">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-white/40">
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id!} value={c.id!}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 h-12">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={cn("rounded-xl transition-all", viewMode === 'list' && "bg-white dark:bg-slate-700 shadow-sm shadow-slate-200/50")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={cn("rounded-xl transition-all", viewMode === 'grid' && "bg-white dark:bg-slate-700 shadow-sm shadow-slate-200/50")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
            <div className="px-8 pt-6">
              <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl h-auto w-auto">
                <TabsTrigger value="active" className="rounded-lg px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm font-bold">Actifs ({filteredActiveStudents.length})</TabsTrigger>
                <TabsTrigger value="archived" className="rounded-lg px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm font-bold">Archives ({archivedStudents.length})</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="active" className="mt-6 focus-visible:ring-0">
              {viewMode === 'list' ? (
                <StudentsTable
                  students={studentsToShow}
                  isLoading={loading}
                  canManageUsers={canManageUsers}
                  actionType="active"
                  onEdit={handleOpenEditDialog}
                  onArchive={handleOpenArchiveDialog}
                  onRestore={handleOpenRestoreDialog}
                />
              ) : (
                <div className="p-8">
                  <StudentsGrid
                    students={studentsToShow}
                    isLoading={loading}
                    actionType="active"
                    onEdit={handleOpenEditDialog}
                    onArchive={handleOpenArchiveDialog}
                    onRestore={handleOpenRestoreDialog}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="archived" className="mt-6 focus-visible:ring-0">
              {viewMode === 'list' ? (
                <StudentsTable
                  students={studentsToShow}
                  isLoading={loading}
                  canManageUsers={canManageUsers}
                  actionType="archived"
                  onEdit={handleOpenEditDialog}
                  onArchive={handleOpenArchiveDialog}
                  onRestore={handleOpenRestoreDialog}
                />
              ) : (
                <div className="p-8">
                  <StudentsGrid
                    students={studentsToShow}
                    isLoading={loading}
                    actionType="archived"
                    onEdit={handleOpenEditDialog}
                    onArchive={handleOpenArchiveDialog}
                    onRestore={handleOpenRestoreDialog}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setEditingStudent(null);
        setIsEditDialogOpen(isOpen);
      }}>
        <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[2rem] border-white/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800">Modifier l&apos;Élève</DialogTitle>
            <DialogDescription className="font-medium">
              Mettez à jour les informations de <span className="text-indigo-600"><strong>{editingStudent?.firstName} {editingStudent?.lastName}</strong></span>.
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
        <AlertDialogContent className="rounded-[2rem] border-white/40 bg-white/90 backdrop-blur-2xl">
          <DialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Radier l&apos;élève ?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-600">
              Cette action marquera l&apos;élève <strong>{studentToArchive?.firstName} {studentToArchive?.lastName}</strong> comme &quot;Radié&quot;. Il sera déplacé vers les archives mais ses données seront conservées.
            </AlertDialogDescription>
          </DialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-slate-200">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveStudent} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-6 font-bold">Radier l&apos;élève</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-white/40 bg-white/90 backdrop-blur-2xl">
          <DialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Restaurer l&apos;élève ?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-600">
              L&apos;élève <strong>{studentToRestore?.firstName} {studentToRestore?.lastName}</strong> retrouvera le statut &quot;Actif&quot; et réapparaîtra dans la liste principale.
            </AlertDialogDescription>
          </DialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-slate-200">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreStudent} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 font-bold">Restaurer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

