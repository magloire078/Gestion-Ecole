
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
import { PlusCircle, Upload, Download, Printer, Search, Users, School, GraduationCap, LayoutGrid, List, Calendar, ArrowUpDown, FileSpreadsheet, FileText } from "lucide-react";
import { useState, useMemo, useEffect, startTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RegistrationFormDialog } from "@/components/inscription/registration-form-dialog";
import { StudentReportsService } from '@/services/student-reports-service';
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
import { collection, doc, query, orderBy, limit, getDocs } from "firebase/firestore";
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
import { StudentsBulkEdit } from '@/components/dossiers/students-bulk-edit';
import { StudentsStatsCards } from '@/components/dossiers/stats-cards';
import { StudentService } from "@/services/student-services";
import { useStudents } from "@/hooks/use-students";
import { useDebounce } from "@/hooks/use-debounce";
import { computeAcademicYearFromDate } from "@/lib/academic-year-utils";
import { useEditableStudentIds } from "@/hooks/use-editable-student-ids";


export default function StudentsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, schoolData, subscription, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>(undefined);

  // Déterminer l'année scolaire par défaut
  useEffect(() => {
    if (schoolData?.currentAcademicYear) {
      setSelectedAcademicYear(schoolData.currentAcademicYear);
    }
  }, [schoolData?.currentAcademicYear]);

  const effectiveAcademicYear = selectedAcademicYear || schoolData?.currentAcademicYear || computeAcademicYearFromDate();

  const availableYears = useMemo(() => {
    const baseYear = parseInt(effectiveAcademicYear.split('-')[0], 10) || 2024;
    return [
      `${baseYear - 2}-${baseYear - 1}`,
      `${baseYear - 1}-${baseYear}`,
      `${baseYear}-${baseYear + 1}`,
      `${baseYear + 1}-${baseYear + 2}`
    ];
  }, [effectiveAcademicYear]);

  // Use new hooks for data fetching
  const { students: allStudents, loading: studentsLoading } = useStudents(schoolId, undefined, undefined, effectiveAcademicYear);

  // Abonnement expiré => compte basculé sur le plan Essentiel : seuls les
  // premiers élèves inscrits (par date d'inscription) restent modifiables.
  const { editableStudentIds, isLimited: isPlanDowngraded } = useEditableStudentIds(schoolId, subscription);
  const lockedStudentIds = useMemo(() => {
    if (!isPlanDowngraded || !editableStudentIds) return undefined;
    return new Set(allStudents.filter(s => s.id && !editableStudentIds.has(s.id)).map(s => s.id!));
  }, [isPlanDowngraded, editableStudentIds, allStudents]);

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
  const debouncedSearchTerm = useDebounce(searchTerm, 150);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedCycle, setSelectedCycle] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'bulk'>('list');
  const [sortBy, setSortBy] = useState('name_asc');

  const { activeStudents, archivedStudents, filteredActiveStudents, filteredByClass } = useMemo(() => {
    const filteredBySearch = allStudents.filter(student =>
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      `${student.lastName} ${student.firstName}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      student.matricule?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );

    let filtered = filteredBySearch;
    if (selectedCycle !== 'all') {
      const classesInCycle = classes.filter(c => c.cycleId === selectedCycle).map(c => c.id);
      filtered = filtered.filter(student => classesInCycle.includes(student.classId));
    }
    if (selectedClass !== 'all') {
      filtered = filtered.filter(student => student.classId === selectedClass);
    }
    const filteredByClass = filtered;

    const active = filteredByClass.filter(student => ['Actif', 'En attente'].includes(student.status));
    const archived = filteredByClass.filter(student => !['Actif', 'En attente'].includes(student.status));

    return {
      activeStudents: allStudents.filter(student => ['Actif', 'En attente'].includes(student.status)),
      archivedStudents: archived,
      filteredActiveStudents: active,
      filteredByClass,
    }
  }, [allStudents, debouncedSearchTerm, selectedClass, selectedCycle, classes]);

  const studentsToShow = selectedStatus === 'active' ? filteredActiveStudents : archivedStudents;

  const sortedStudentsToShow = useMemo(() => {
    let sorted = [...studentsToShow];
    switch (sortBy) {
      case 'name_asc':
        sorted.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
        break;
      case 'name_desc':
        sorted.sort((a, b) => (b.lastName || '').localeCompare(a.lastName || ''));
        break;
      case 'class_asc':
        sorted.sort((a, b) => {
          const classA = classes.find(c => c.id === a.classId)?.name || '';
          const classB = classes.find(c => c.id === b.classId)?.name || '';
          return classA.localeCompare(classB);
        });
        break;
      case 'class_desc':
        sorted.sort((a, b) => {
          const classA = classes.find(c => c.id === a.classId)?.name || '';
          const classB = classes.find(c => c.id === b.classId)?.name || '';
          return classB.localeCompare(classA);
        });
        break;
      case 'age_asc':
        // Plus jeune au plus vieux (date de naissance plus grande -> plus jeune)
        sorted.sort((a, b) => {
          const dateA = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : 0;
          const dateB = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'age_desc':
        sorted.sort((a, b) => {
          const dateA = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : 0;
          const dateB = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'gender_asc':
        sorted.sort((a, b) => (a.gender || '').localeCompare(b.gender || ''));
        break;
      case 'gender_desc':
        sorted.sort((a, b) => (b.gender || '').localeCompare(a.gender || ''));
        break;
    }
    return sorted;
  }, [studentsToShow, sortBy, classes]);

  const stats = useMemo(() => {
    const listToUse = debouncedSearchTerm || selectedClass !== 'all' ? filteredActiveStudents : activeStudents;
    const boys = listToUse.filter(s => s.gender === 'Masculin').length;
    const girls = listToUse.filter(s => s.gender === 'Féminin').length;
    return {
      total: listToUse.length,
      boys,
      girls,
      classes: classes.length,
      cycles: cycles.length
    }
  }, [activeStudents, filteredActiveStudents, classes, cycles, debouncedSearchTerm, selectedClass]);


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
    if (student.id && lockedStudentIds?.has(student.id)) return;
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleOpenArchiveDialog = (student: Student) => {
    if (student.id && lockedStudentIds?.has(student.id)) return;
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      const selectedClassName = selectedClass !== 'all' ? classes.find(c => c.id === selectedClass)?.name : undefined;
      await StudentReportsService.generateStudentListPdf(
        filteredByClass,
        schoolData?.name || 'Notre École',
        effectiveAcademicYear,
        schoolData?.mainLogoUrl,
        selectedClassName
      );
      toast({ title: 'Succès', description: 'Le PDF a été généré.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Erreur lors de la génération du PDF.' });
    }
  };
  const loading = schoolLoading || studentsLoading || classesLoading || feesLoading || niveauxLoading || userLoading || cyclesLoading;

  return (
    <div className="p-4 md:p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 print:m-0 print:p-0 print:w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/60 dark:border-slate-800/60 shadow-sm print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">
               Pédagogie
             </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
            Dossiers Élèves
          </h1>
          <p className="text-slate-500 max-w-2xl text-xs sm:text-sm font-medium">
            Gestion centrale des effectifs : inscriptions, suivi pédagogique et informations personnelles.
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="flex-1 sm:flex-initial rounded-xl border-slate-200 hover:bg-slate-50 transition-all font-semibold text-xs sm:text-sm h-10 sm:h-11"
          >
            <Printer className="mr-1.5 sm:mr-2 h-4 w-4 text-slate-500" />
            <span>Imprimer</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            className="flex-1 sm:flex-initial rounded-xl border-slate-200 hover:bg-slate-50 transition-all font-semibold text-xs sm:text-sm h-10 sm:h-11"
          >
            <Download className="mr-1.5 sm:mr-2 h-4 w-4 text-slate-500" />
            <span>Exporter PDF</span>
          </Button>
          <RegistrationFormDialog
            classes={classes}
            trigger={
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-initial rounded-xl border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 transition-all font-semibold text-xs sm:text-sm h-10 sm:h-11 gap-1.5"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Fiche Inscription</span>
              </Button>
            }
          />
          {canManageUsers && (
            <Button 
              onClick={() => router.push('/dashboard/inscription')}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none transition-all duration-200 rounded-xl px-5 font-bold text-xs sm:text-sm h-10 sm:h-11 shrink-0"
            >
              <PlusCircle className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
              Inscrire un Élève
            </Button>
          )}
        </div>
      </div>

      <div className="print:hidden">
        <StudentsStatsCards stats={stats} isLoading={loading} />
      </div>

      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/40 dark:border-slate-800/40 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-end print:hidden">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Recherche rapide</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Nom, matricule ou classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 sm:h-12 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-xl focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-row gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="w-full md:w-[130px] space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Année</label>
            <Select value={effectiveAcademicYear} onValueChange={(val) => startTransition(() => setSelectedAcademicYear(val))}>
              <SelectTrigger className="h-11 sm:h-12 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 rounded-xl focus:ring-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm">
                <Calendar className="mr-1.5 sm:mr-2 h-4 w-4 text-indigo-500" />
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-indigo-200 dark:border-indigo-800">
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[160px] space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cycle</label>
            <Select value={selectedCycle} onValueChange={(val) => startTransition(() => setSelectedCycle(val))}>
              <SelectTrigger className="h-11 sm:h-12 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-xl focus:ring-indigo-500 text-xs sm:text-sm">
                <SelectValue placeholder="Tous les cycles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/40">
                <SelectItem value="all">Tous les cycles</SelectItem>
                {cycles.map(cycle => (
                  <SelectItem key={cycle.id!} value={cycle.id!}>{cycle.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[160px] space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Classe</label>
            <Select value={selectedClass} onValueChange={(val) => startTransition(() => setSelectedClass(val))}>
              <SelectTrigger className="h-11 sm:h-12 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-xl focus:ring-indigo-500 text-xs sm:text-sm">
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/40">
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id!} value={c.id!}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[160px] space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Trier par</label>
            <Select value={sortBy} onValueChange={(val) => startTransition(() => setSortBy(val))}>
              <SelectTrigger className="h-11 sm:h-12 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-xl focus:ring-indigo-500 text-xs sm:text-sm">
                <ArrowUpDown className="mr-1.5 sm:mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Trier par..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/40">
                <SelectItem value="name_asc">Nom (A-Z)</SelectItem>
                <SelectItem value="name_desc">Nom (Z-A)</SelectItem>
                <SelectItem value="class_asc">Classe (A-Z)</SelectItem>
                <SelectItem value="class_desc">Classe (Z-A)</SelectItem>
                <SelectItem value="age_asc">Âge (Plus jeune)</SelectItem>
                <SelectItem value="age_desc">Âge (Plus vieux)</SelectItem>
                <SelectItem value="gender_asc">Sexe (A-Z)</SelectItem>
                <SelectItem value="gender_desc">Sexe (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 h-11 sm:h-12 self-center md:self-auto shrink-0">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            title="Vue Liste"
            onClick={() => startTransition(() => setViewMode('list'))}
            className={cn("rounded-xl transition-all h-9 w-9 sm:h-10 sm:w-10", viewMode === 'list' && "bg-white dark:bg-slate-700 shadow-sm shadow-slate-200/50")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            title="Vue Cartes"
            onClick={() => startTransition(() => setViewMode('grid'))}
            className={cn("rounded-xl transition-all h-9 w-9 sm:h-10 sm:w-10", viewMode === 'grid' && "bg-white dark:bg-slate-700 shadow-sm shadow-slate-200/50")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'bulk' ? 'secondary' : 'ghost'}
            size="icon"
            title="Mode Tableur / Édition en Masse"
            onClick={() => startTransition(() => setViewMode('bulk'))}
            className={cn("rounded-xl transition-all h-9 w-9 sm:h-10 sm:w-10", viewMode === 'bulk' && "bg-white dark:bg-slate-700 shadow-sm shadow-slate-200/50 text-blue-600")}
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 shadow-xl shadow-slate-200/50 rounded-xl overflow-hidden print:shadow-none print:border-none print:bg-transparent print:m-0 print:p-0">
        <CardContent className="p-0">
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
            <div className="px-6 pt-4 print:hidden">
              <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl h-auto w-auto">
                <TabsTrigger value="active" className="rounded-lg px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm font-bold">Actifs ({filteredActiveStudents.length})</TabsTrigger>
                <TabsTrigger value="archived" className="rounded-lg px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm font-bold">Archives ({archivedStudents.length})</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="active" className="mt-6 focus-visible:ring-0">
              {viewMode === 'list' ? (
                <StudentsTable
                  students={sortedStudentsToShow}
                  isLoading={loading}
                  canManageUsers={canManageUsers}
                  actionType="active"
                  onEdit={handleOpenEditDialog}
                  onArchive={handleOpenArchiveDialog}
                  onRestore={handleOpenRestoreDialog}
                  lockedStudentIds={lockedStudentIds}
                />
              ) : viewMode === 'grid' ? (
                <div className="p-4 md:p-6">
                  <StudentsGrid
                    students={sortedStudentsToShow}
                    isLoading={loading}
                    actionType="active"
                    onEdit={handleOpenEditDialog}
                    onArchive={handleOpenArchiveDialog}
                    onRestore={handleOpenRestoreDialog}
                    lockedStudentIds={lockedStudentIds}
                  />
                </div>
              ) : (
                <div className="p-4 md:p-6">
                  <StudentsBulkEdit
                    schoolId={schoolId || ''}
                    students={sortedStudentsToShow}
                    classes={classes}
                    isLoading={loading}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="archived" className="mt-6 focus-visible:ring-0">
              {viewMode === 'list' ? (
                <StudentsTable
                  students={sortedStudentsToShow}
                  isLoading={loading}
                  canManageUsers={canManageUsers}
                  actionType="archived"
                  onEdit={handleOpenEditDialog}
                  onArchive={handleOpenArchiveDialog}
                  onRestore={handleOpenRestoreDialog}
                  lockedStudentIds={lockedStudentIds}
                />
              ) : viewMode === 'grid' ? (
                <div className="p-4 md:p-6">
                  <StudentsGrid
                    students={sortedStudentsToShow}
                    isLoading={loading}
                    actionType="archived"
                    onEdit={handleOpenEditDialog}
                    onArchive={handleOpenArchiveDialog}
                    onRestore={handleOpenRestoreDialog}
                    lockedStudentIds={lockedStudentIds}
                  />
                </div>
              ) : (
                <div className="p-4 md:p-6">
                  <StudentsBulkEdit
                    schoolId={schoolId || ''}
                    students={sortedStudentsToShow}
                    classes={classes}
                    isLoading={loading}
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
        <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-2xl rounded-xl border-white/40 shadow-2xl">
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
        <AlertDialogContent className="rounded-xl border-white/40 bg-white/90 backdrop-blur-2xl">
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
        <AlertDialogContent className="rounded-xl border-white/40 bg-white/90 backdrop-blur-2xl">
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

