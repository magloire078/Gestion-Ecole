'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Users,
  School,
  ArrowRightLeft,
  ChevronRight,
  Search,
  CheckCircle,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useAcademicYear } from '@/providers/academic-year-provider';
import { assignStudentsToClass, revertClassAssignment } from '@/services/class-assignment-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { student as Student, class_type as Class } from '@/lib/data-types';

export default function ClassAssignmentPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { user } = useUser();
  const { currentYear } = useAcademicYear();

  // États
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [leftSearchQuery, setLeftSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
  const [isAssigning, setIsAssigning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Charger les classes
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class & { id: string })) || [], [classesData]);

  // Charger tous les élèves actifs de l'école
  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const allStudents = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & { id: string })) || [], [studentsData]);

  // Séparer les élèves:
  // 1. Liste de gauche: Élèves non-assignés à la classe cible (sans classe ou dans une autre classe)
  const leftStudents = useMemo(() => {
    return allStudents.filter(s => s.classId !== selectedClassId);
  }, [allStudents, selectedClassId]);

  // 2. Liste de droite: Élèves déjà assignés à la classe cible
  const rightStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return allStudents.filter(s => s.classId === selectedClassId);
  }, [allStudents, selectedClassId]);

  // Recherche à gauche
  const filteredLeftStudents = useMemo(() => {
    return leftStudents.filter(s => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchSearch = fullName.includes(leftSearchQuery.toLowerCase()) || (s.matricule?.toLowerCase().includes(leftSearchQuery.toLowerCase()) || false);
      return matchSearch;
    });
  }, [leftStudents, leftSearchQuery]);

  const targetClassInfo = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Gérer la sélection
  const handleToggleSelectStudent = (id: string, checked: boolean) => {
    setSelectedStudentIds(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleSelectAllLeft = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    if (checked) {
      filteredLeftStudents.forEach(s => {
        updated[s.id] = true;
      });
    }
    setSelectedStudentIds(updated);
  };

  const selectedCount = useMemo(() => {
    return Object.values(selectedStudentIds).filter(Boolean).length;
  }, [selectedStudentIds]);

  const projectedCount = (targetClassInfo?.studentCount || 0) + selectedCount;
  const isOverCapacity = !!targetClassInfo && projectedCount > (targetClassInfo.maxStudents || 30);

  // Lancer l'attribution en lot (après confirmation)
  const handleAssignSelected = async () => {
    if (!schoolId || !selectedClassId || selectedCount === 0 || !targetClassInfo || !user?.uid) return;

    setIsAssigning(true);
    setShowConfirm(false);

    try {
      const selectedIds = Object.keys(selectedStudentIds).filter(id => selectedStudentIds[id]);

      const result = await assignStudentsToClass({
        schoolId,
        studentIds: selectedIds,
        toClassId: selectedClassId,
        toClassName: targetClassInfo.name,
        academicYear: currentYear,
        userId: user.uid,
        userName: user.displayName ?? undefined,
        userRole: user.profile?.role,
      });

      toast({
        title: 'Attribution réussie !',
        description: `${result.assigned} élève(s) affecté(s) à la classe ${targetClassInfo.name}.${result.unchanged > 0 ? ` ${result.unchanged} étaient déjà dans cette classe.` : ''}`,
        ...(result.auditLogId ? {
          action: (
            <ToastAction
              altText="Annuler l'attribution"
              onClick={async () => {
                try {
                  await revertClassAssignment(schoolId, result.auditLogId!, user.uid);
                  toast({ title: 'Attribution annulée', description: 'Les élèves ont retrouvé leur classe précédente.' });
                } catch (err: any) {
                  toast({ variant: 'destructive', title: 'Impossible d\'annuler', description: err?.message ?? 'Erreur inconnue.' });
                }
              }}
            >
              Annuler
            </ToastAction>
          ),
        } : {}),
      });

      // Reset
      setSelectedStudentIds({});
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue lors de l\'attribution.' });
    } finally {
      setIsAssigning(false);
    }
  };

  const isLoading = schoolLoading || classesLoading || studentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attribution de Classes en Lot</h1>
        <p className="text-sm text-slate-500 font-medium">
          Affectez rapidement plusieurs élèves à une classe de destination.
        </p>
      </div>

      {/* Cible */}
      <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Classe de Destination</h3>
            <p className="text-xs text-slate-500">Sélectionnez la classe dans laquelle vous souhaitez transférer les élèves.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Choisir la classe cible" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.studentCount || 0} / {c.maxStudents || 30} inscrits)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Double Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel Gauche: Candidats à l'affectation */}
        <Card className="rounded-2xl border-none shadow-md lg:col-span-7 bg-white/70 backdrop-blur-xl flex flex-col overflow-hidden min-h-[500px]">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-700">Élèves Disponibles</CardTitle>
                <CardDescription className="text-xs">Sélectionnez les élèves à affecter.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Rechercher élève..." 
                  value={leftSearchQuery}
                  onChange={(e) => setLeftSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[450px]">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={filteredLeftStudents.length > 0 && filteredLeftStudents.every(s => selectedStudentIds[s.id])}
                      onCheckedChange={(checked) => handleSelectAllLeft(!!checked)}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase text-slate-400">Élève</TableHead>
                  <TableHead className="text-xs font-black uppercase text-slate-400">Classe Actuelle</TableHead>
                  <TableHead className="text-xs font-black uppercase text-slate-400">Sexe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeftStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                      Aucun élève disponible trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeftStudents.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/40">
                      <TableCell>
                        <Checkbox 
                          checked={!!selectedStudentIds[s.id]}
                          onCheckedChange={(checked) => handleToggleSelectStudent(s.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {s.lastName} {s.firstName}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-600">
                        {s.class || <span className="text-amber-600 font-bold italic">Sans classe</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {s.gender === 'Masculin' ? 'M' : 'F'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bouton de transfert / actions au milieu */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col items-center justify-center gap-4">
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={selectedCount === 0 || !selectedClassId || isAssigning}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white p-3 lg:p-4 h-auto aspect-square transition-all hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50"
            title="Transférer vers la classe"
          >
            {isAssigning ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ChevronRight className="h-6 w-6 rotate-90 lg:rotate-0" />
            )}
          </Button>
          {selectedCount > 0 && (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200/50">
              {selectedCount} sélectionné{selectedCount > 1 && 's'}
            </span>
          )}
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l&apos;attribution</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>{selectedCount}</strong> élève{selectedCount > 1 && 's'} vont être affecté{selectedCount > 1 && 's'} à la classe{' '}
                    <strong>{targetClassInfo?.name}</strong> pour l&apos;année {currentYear}.
                  </p>
                  {isOverCapacity && (
                    <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-700 font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Cette classe passera à {projectedCount} élèves, au-delà de sa capacité de {targetClassInfo?.maxStudents || 30}.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleAssignSelected}>Confirmer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Panel Droite: Composition actuelle de la classe cible */}
        <Card className="rounded-2xl border-none shadow-md lg:col-span-4 bg-white/70 backdrop-blur-xl flex flex-col overflow-hidden min-h-[500px]">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-bold text-slate-700">Composition Actuelle</CardTitle>
            <CardDescription className="text-xs">
              {targetClassInfo ? `Élèves déjà dans ${targetClassInfo.name}` : 'Sélectionnez une classe cible pour voir sa composition.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[450px]">
            {!selectedClassId ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 h-full mt-20 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-medium">Veuillez choisir une classe de destination.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase text-slate-400">Élève</TableHead>
                    <TableHead className="text-xs font-black uppercase text-slate-400 text-right">Sexe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rightStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-12 text-slate-400 text-xs italic">
                        Aucun élève dans cette classe pour le moment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rightStudents.map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/40">
                        <TableCell className="font-semibold text-slate-800 text-xs">
                          {s.lastName} {s.firstName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono text-right">
                          {s.gender === 'Masculin' ? 'M' : 'F'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
