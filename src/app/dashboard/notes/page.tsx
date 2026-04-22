

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PlusCircle, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  BarChart2, 
  CheckCircle2, 
  MinusCircle, 
  AlertTriangle,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { subject as Subject } from '@/lib/data-types';
import { GradesService, type GradeEntry } from '@/services/grades-service';
import { useGrades } from '@/hooks/use-grades';

// --- Interfaces ---
interface Student {
  id: string;
  firstName: string;
  lastName: string;
}
interface Class {
  id: string;
  name: string;
}


// --- Zod Schema for Validation ---
const gradeSchema = z.object({
  studentId: z.string().min(1, { message: "Veuillez sélectionner un élève." }),
  type: z.enum(['Interrogation', 'Devoir', 'Composition Mensuelle', 'Composition Nationale', 'Composition de Zone']),
  date: z.string().min(1, { message: "La date est requise." }),
  grade: z.coerce.number().min(0, "La note ne peut pas être négative.").max(20, "La note ne peut pas dépasser 20."),
  coefficient: z.coerce.number().min(0.25, "Le coefficient doit être d'au moins 0.25."),
});
type GradeFormValues = z.infer<typeof gradeSchema>;


interface StatProgressBarProps {
  percentage: number;
  className?: string;
}

const StatProgressBar = ({ percentage, className }: StatProgressBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${percentage}%`;
    }
  }, [percentage]);

  return (
    <div 
      ref={barRef}
      className={cn("h-full transition-all duration-1000", className)}
    />
  );
};

export default function GradeEntryPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { user } = useUser();
  const { toast } = useToast();

  const canManageGrades = !!user?.profile?.permissions?.manageGrades;

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // --- Data Fetching ---
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const studentsQuery = useMemo(() =>
    schoolId && selectedClassId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('classId', '==', selectedClassId)) : null
    , [firestore, schoolId, selectedClassId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const studentsInClass: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

  const subjectsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/matieres`)) : null, [firestore, schoolId]);
  const { data: subjectsData, loading: subjectsLoading } = useCollection(subjectsQuery);
  const subjects = useMemo(() => subjectsData?.map(d => d.data() as Subject) || [], [subjectsData]);

  // Use the new hook to fetch grades
  const { grades: allGradesForSubject, loading: isGradesLoading } = useGrades(schoolId, studentsInClass, selectedSubject);

  const stats = useMemo(() => {
    if (allGradesForSubject.length === 0) return null;

    const totalCoeff = allGradesForSubject.reduce((acc, g) => acc + (g.coefficient || 1), 0);
    const weightedSum = allGradesForSubject.reduce((acc, g) => acc + (g.grade * (g.coefficient || 1)), 0);
    
    const average = weightedSum / totalCoeff;
    const gradesValues = allGradesForSubject.map(g => g.grade);
    const max = Math.max(...gradesValues);
    const min = Math.min(...gradesValues);
    const successCount = gradesValues.filter(g => g >= 10).length;
    const successRate = (successCount / gradesValues.length) * 100;

    return { 
      average: average.toFixed(2), 
      max: max.toFixed(2), 
      min: min.toFixed(2), 
      successRate: Math.round(successRate),
      total: gradesValues.length
    };
  }, [allGradesForSubject]);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeEntry | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<GradeEntry | null>(null);
  const [todayDateString, setTodayDateString] = useState('');

  useEffect(() => {
    setTodayDateString(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      studentId: '',
      type: 'Devoir',
      date: '', // Initialize as empty
      grade: 0,
      coefficient: 1,
    }
  });

  useEffect(() => {
    if (isFormOpen && todayDateString) {
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
          date: todayDateString,
          grade: 0,
          coefficient: 1,
        });
      }
    }
  }, [isFormOpen, editingGrade, form, todayDateString]);


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
        await GradesService.updateGrade(schoolId, editingGrade.studentId, editingGrade.id, gradeData);
        toast({ title: 'Note modifiée', description: `La note a été mise à jour.` });
      } else {
        // Create
        await GradesService.createGrade(schoolId, values.studentId, gradeData);
        toast({ title: 'Note ajoutée avec succès !' });
      }
      setIsFormOpen(false);
      // The useGrades hook will automatically refresh the data
    } catch (error) {
      console.error("Error saving grade:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la note." });
    }
  }

  const handleOpenDeleteDialog = (grade: GradeEntry) => {
    setGradeToDelete(grade);
    setIsDeleting(true);
  };

  const handleDeleteGrade = async () => {
    if (!schoolId || !gradeToDelete) return;

    try {
      await GradesService.deleteGrade(schoolId, gradeToDelete.studentId, gradeToDelete.id);
      toast({ title: 'Note supprimée', description: 'La note a été supprimée.' });
      setIsDeleting(false);
      setGradeToDelete(null);
      // The useGrades hook will automatically refresh the data
    } catch (error) {
      console.error("Error deleting grade:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la note." });
    }
  };


  const getGradeStyles = (grade: number) => {
    if (grade >= 16) return 'bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-200';
    if (grade >= 12) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (grade >= 10) return 'bg-blue-100 text-blue-700 border border-blue-200 text-blue-800';
    if (grade >= 7) return 'bg-amber-100 text-amber-700 border border-amber-200';
    return 'bg-rose-100 text-rose-700 border border-rose-200';
  };

  // --- Progression Logic ---
  const getProgressionIndicator = (currentGrade: GradeEntry) => {
    // Find all grades for this student, sorted by date (already sorted by service, but ensuring order)
    const studentGrades = allGradesForSubject
      .filter(g => g.studentId === currentGrade.studentId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentIndex = studentGrades.findIndex(g => g.id === currentGrade.id);
    if (currentIndex <= 0) return null; // First grade or not found

    const previousGrade = studentGrades[currentIndex - 1];
    const diff = currentGrade.grade - previousGrade.grade;

    if (diff > 0) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">
              <TrendingUp className="h-3 w-3" />
              +{diff.toFixed(1)}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-none rounded-lg text-[10px]">
            Progression par rapport à : {previousGrade.grade.toFixed(1)} ({previousGrade.type})
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    if (diff < 0) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1 text-rose-600 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 shadow-sm">
              <TrendingDown className="h-3 w-3" />
              {diff.toFixed(1)}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-none rounded-lg text-[10px]">
            Régression par rapport à : {previousGrade.grade.toFixed(1)} ({previousGrade.type})
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    return (
      <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
        <MinusCircle className="h-3 w-3" />
        STABLE
      </div>
    );
  };

  const isLoading = schoolLoading || classesLoading || subjectsLoading;
  const isDataLoading = studentsLoading || isGradesLoading;

  if (!schoolId) return <div className="p-8">Configuration de l&apos;école manquante...</div>;

  return (
    <>
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-600 bg-clip-text text-transparent">Saisie des Notes</h1>
            <p className="text-slate-500 max-w-2xl text-sm font-medium">
              Tableau de bord analytique pour la gestion de la performance académique par classe et matière.
            </p>
          </div>
          {canManageGrades && selectedClassId && selectedSubject && (
            <Button 
              onClick={() => handleOpenFormDialog(null)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-1 rounded-xl px-6"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nouvelle Note
            </Button>
          )}
        </div>
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 space-y-4 animate-in slide-in-from-top-4 duration-1000 delay-150">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-[250px]">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block px-1">Classe</label>
              <Select onValueChange={setSelectedClassId} disabled={isLoading}>
                <SelectTrigger className="w-full bg-white/50 border-white/60 rounded-xl focus:ring-indigo-500">
                  <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner une classe"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/40">
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[250px]">
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block px-1">Matière</label>
              <Select onValueChange={setSelectedSubject} value={selectedSubject || ''} disabled={!selectedClassId}>
                <SelectTrigger className="w-full bg-white/50 border-white/60 rounded-xl focus:ring-indigo-500">
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/40">
                  {subjects.map(subject => (
                    <SelectItem key={subject.name} value={subject.name}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {selectedClassId && selectedSubject && stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Card className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 group rounded-[2rem] overflow-hidden border-t-white/80 shrink-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne Classe</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-black text-indigo-600 tracking-tight">{stats.average}</h3>
                      <span className="text-sm font-bold text-slate-400">/20</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm shadow-indigo-100 group-hover:rotate-6">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 h-2 w-full bg-slate-100/50 rounded-full overflow-hidden border border-slate-100/50">
                  <StatProgressBar 
                    percentage={(Number(stats.average) / 20) * 100}
                    className="bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] animate-shimmer rounded-full" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-2xl hover:shadow-emerald-100/50 transition-all duration-500 group rounded-[2rem] overflow-hidden border-t-white/80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taux de Réussite</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-black text-emerald-600 tracking-tight">{stats.successRate}%</h3>
                    </div>
                  </div>
                  <div className="p-3.5 bg-emerald-50 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm shadow-emerald-100 group-hover:-rotate-6">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 h-2 w-full bg-slate-100/50 rounded-full overflow-hidden border border-slate-100/50">
                  <StatProgressBar 
                    percentage={stats.successRate}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-500 group rounded-[2rem] overflow-hidden border-t-white/80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meilleure Note</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-black text-amber-500 tracking-tight">{stats.max}</h3>
                      <span className="text-sm font-bold text-slate-400">/20</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-amber-50 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm shadow-amber-100 group-hover:scale-110">
                    <BarChart2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100/50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full w-full opacity-30" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    Record
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-2xl hover:shadow-rose-100/50 transition-all duration-500 group rounded-[2rem] overflow-hidden border-t-white/80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Note Minimale</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-black text-rose-500 tracking-tight">{stats.min}</h3>
                      <span className="text-sm font-bold text-slate-400">/20</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-rose-50 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-all duration-500 shadow-sm shadow-rose-100 group-hover:animate-pulse">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100/50 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full w-full opacity-30" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    Attention
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 group rounded-[2rem] overflow-hidden border-t-white/80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Evaluations</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-black text-indigo-600 tracking-tight">{allGradesForSubject.length}</h3>
                      <span className="text-sm font-bold text-slate-400">Total</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm shadow-indigo-100">
                    <Layers className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100/50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full w-full opacity-30" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Volume
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedClassId && selectedSubject ? (
          <Card className="bg-white/40 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-t-white/60 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <CardHeader className="pb-4 border-b border-slate-100/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">
                    Notes de {classes.find(c => c.id === selectedClassId)?.name}
                  </CardTitle>
                  <CardDescription className="text-slate-500 font-medium">
                    Matière : <span className="text-indigo-600 font-semibold">{selectedSubject}</span>
                  </CardDescription>
                </div>
                {canManageGrades && (
                  <Button 
                    onClick={() => handleOpenFormDialog(null)}
                    size="sm"
                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 rounded-xl font-semibold px-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter une note
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/40">
                  <TableRow className="border-b-slate-100/50 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8 h-12">Élève</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest h-12">Date</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest h-12">Type</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest h-12">Note /20</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest h-12">Progression</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center h-12">Coeff.</TableHead>
                    {canManageGrades && <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-8 h-12">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDataLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-8"><Skeleton className="h-5 w-32 rounded-lg" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 rounded-lg" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-lg" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12 rounded-lg" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-lg" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-8 mx-auto rounded-lg" /></TableCell>
                        {canManageGrades && <TableCell className="pr-8 text-right"><Skeleton className="h-8 w-16 ml-auto rounded-lg" /></TableCell>}
                      </TableRow>
                    ))
                  ) : allGradesForSubject.length > 0 ? (
                    allGradesForSubject.map(grade => (
                      <TableRow key={grade.id} className="hover:bg-indigo-50/30 transition-colors border-b-slate-50/50">
                        <TableCell className="pl-8 font-bold text-slate-700">{grade.studentName}</TableCell>
                        <TableCell className="text-slate-500 text-sm font-medium">{format(new Date(grade.date), 'd MMM yyyy', { locale: fr })}</TableCell>
                        <TableCell>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200/50">
                            {grade.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-3 py-1 text-xs font-black transition-all duration-300 border shadow-sm",
                              getGradeStyles(grade.grade)
                            )}
                          >
                            {grade.grade.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getProgressionIndicator(grade)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-black text-slate-600">{grade.coefficient}</TableCell>
                        {canManageGrades && (
                          <TableCell className="pr-8 text-right space-x-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" onClick={() => handleOpenFormDialog(grade)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => handleOpenDeleteDialog(grade)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canManageGrades ? 6 : 5} className="h-64">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <MinusCircle className="h-10 w-10 text-slate-300" />
                          </div>
                          <h4 className="text-lg font-semibold text-slate-900">Aucune note trouvée</h4>
                          <p className="text-slate-500 max-w-[250px] mt-1">
                            Commencez par ajouter la première note pour cette classe en {selectedSubject}.
                          </p>
                          {canManageGrades && (
                            <Button 
                              onClick={() => handleOpenFormDialog(null)}
                              variant="outline"
                              className="mt-6 rounded-xl border-slate-200"
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Saisir une note
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 bg-white/30 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-3xl animate-in zoom-in-95 duration-500">
            <div className="p-4 bg-indigo-50 rounded-3xl mb-4">
              <BarChart2 className="h-12 w-12 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Analyse de Classe</h3>
            <p className="text-slate-500 text-center max-w-sm mt-2 px-6">
              Sélectionnez une classe et une matière ci-dessus pour accéder au tableau de bord des notes et aux statistiques de performance.
            </p>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-transparent shadow-2xl">
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-[32px] overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <PlusCircle className="h-24 w-24" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">{editingGrade ? 'Modifier' : 'Ajouter'} une note</DialogTitle>
                <DialogDescription className="text-indigo-100/80 font-medium">
                  Matière : <span className="text-white font-bold">{selectedSubject}</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-8">
              <Form {...form}>
                <form id="grade-form" onSubmit={form.handleSubmit(handleSubmitGrade)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="studentId"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Élève</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!!editingGrade}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 focus:ring-indigo-500 font-bold text-slate-700">
                                <SelectValue placeholder="Sélectionner un élève" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-slate-100">
                              {studentsInClass.map(s => <SelectItem key={s.id} value={s.id} className="font-medium">{s.firstName} {s.lastName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Type d&apos;évaluation</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 focus:ring-indigo-500 font-bold text-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-slate-100">
                              <SelectItem value="Devoir" className="font-medium">Devoir</SelectItem>
                              <SelectItem value="Interrogation" className="font-medium">Interrogation</SelectItem>
                              <SelectItem value="Composition Mensuelle" className="font-medium">Composition Mensuelle</SelectItem>
                              <SelectItem value="Composition de Zone" className="font-medium">Composition de Zone</SelectItem>
                              <SelectItem value="Composition Nationale" className="font-medium">Composition Nationale</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              className="bg-slate-50 border-slate-200 rounded-xl h-12 focus:ring-indigo-500 font-bold text-slate-700"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Note /20</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type="number" 
                                placeholder="00.0" 
                                {...field} 
                                className="bg-slate-50 border-slate-200 rounded-xl h-12 focus:ring-indigo-500 font-black text-lg text-indigo-600 pl-4 pr-12"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">/20</div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="coefficient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Coefficient</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1" 
                              {...field} 
                              className="bg-slate-50 border-slate-200 rounded-xl h-12 focus:ring-indigo-500 font-bold text-slate-700"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>

              <div className="mt-10 flex gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 h-12 rounded-2xl font-bold text-slate-500"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  form="grade-form" 
                  disabled={form.formState.isSubmitting}
                  className="flex-[2] h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-200"
                >
                  <span className="flex items-center gap-2">
                    {form.formState.isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4" />
                        {editingGrade ? 'Mettre à jour' : 'Enregistrer la note'}
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-2xl">
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-[32px] overflow-hidden p-8">
            <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            
            <div className="text-center space-y-2">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black text-slate-800 text-center">Confirmation</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500 font-medium text-center">
                  Êtes-vous sûr(e) de vouloir supprimer cette note ? Cette action est <span className="text-rose-600 font-bold">irréversible</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>

            <div className="mt-8 flex gap-3">
              <AlertDialogCancel className="flex-1 h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold text-slate-500 hover:bg-slate-100">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteGrade} 
                className="flex-1 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black shadow-lg shadow-rose-100"
              >
                Supprimer
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}



