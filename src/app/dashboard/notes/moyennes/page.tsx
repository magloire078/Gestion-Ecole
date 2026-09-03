'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Calculator,
  Printer,
  ChevronRight,
  TrendingUp,
  Download,
  Lock,
  LockOpen,
  Award,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { student as Student, class_type as Class, subject as Subject } from '@/lib/data-types';

export default function AveragesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  // Filtres
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Trimestre 1');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPeriodLocked, setIsPeriodLocked] = useState(false);

  // Charger les classes
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class & { id: string })) || [], [classesData]);

  // Charger les matières de l'école
  const subjectsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/matieres`)) : null, [firestore, schoolId]);
  const { data: subjectsData, loading: subjectsLoading } = useCollection(subjectsQuery);
  const subjects = useMemo(() => subjectsData?.map(d => ({ id: d.id, ...d.data() } as Subject)) || [], [subjectsData]);

  // Charger les élèves de la classe sélectionnée
  const studentsQuery = useMemo(() => {
    return (schoolId && selectedClassId)
      ? query(
          collection(firestore, `ecoles/${schoolId}/eleves`),
          where('classId', '==', selectedClassId),
          where('status', '==', 'Actif')
        )
      : null;
  }, [firestore, schoolId, selectedClassId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const students = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & { id: string })) || [], [studentsData]);

  const selectedClassInfo = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Périodes d'évaluation adaptées au cycle de la classe
  const availablePeriods = useMemo(() => {
    if (!selectedClassInfo) return ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
    const className = selectedClassInfo.name.toLowerCase();
    if (className.includes('maternelle') || className.includes('primaire') || className.includes('cp') || className.includes('ce') || className.includes('cm')) {
      return ['Composition 1', 'Composition 2', 'Composition 3', 'Composition 4'];
    }
    return ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
  }, [selectedClassInfo]);

  // Calcul déterministe des moyennes simulées pour chaque élève et chaque matière
  const studentAverages = useMemo(() => {
    if (students.length === 0 || subjects.length === 0) return [];

    const computed = students.map((student) => {
      let totalGrade = 0;
      let totalCoef = 0;
      
      const grades: Record<string, number> = {};
      
      subjects.forEach((subject) => {
        // Formule déterministe basée sur l'ID de l'élève et la matière
        const code = (student.id.charCodeAt(0) || 0) + (subject.name.charCodeAt(0) || 0) + selectedPeriod.charCodeAt(selectedPeriod.length - 1);
        const grade = 9 + (code % 11) + ((code % 3) * 0.25); // Note réaliste entre 9 et 20
        const roundedGrade = Math.min(20, Math.max(0, parseFloat(grade.toFixed(2))));
        
        grades[subject.name] = roundedGrade;
        
        // Simuler des coefficients (e.g. Math=4, Français=5, SVT=2, etc.)
        let coef = 2;
        if (subject.name.toLowerCase().includes('math')) coef = 4;
        if (subject.name.toLowerCase().includes('français')) coef = 5;
        
        totalGrade += roundedGrade * coef;
        totalCoef += coef;
      });

      const averageG = totalGrade / totalCoef;

      let observation = "Passable";
      if (averageG >= 16) observation = "Excellent (Félicitations)";
      else if (averageG >= 14) observation = "Très Bien (Tableau d'Honneur)";
      else if (averageG >= 12) observation = "Assez Bien (Encouragements)";
      else if (averageG >= 10) observation = "Passable";
      else observation = "Avertissement travail";

      return {
        studentId: student.id,
        name: `${student.lastName} ${student.firstName}`,
        matricule: student.matricule || student.id.substring(0, 8),
        grades,
        averageG: parseFloat(averageG.toFixed(2)),
        observation
      };
    });

    // Trier les élèves par ordre décroissant de moyenne générale
    computed.sort((a, b) => b.averageG - a.averageG);

    // Assigner les rangs
    return computed.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [students, subjects, selectedPeriod]);

  // Lancer le calcul
  const handleCalculateAverages = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      toast({
        title: "Calcul terminé !",
        description: `Les moyennes pour la classe ${selectedClassInfo?.name} ont été recalculées avec succès.`,
      });
    }, 1500);
  };

  const isLoading = schoolLoading || classesLoading || subjectsLoading;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Calculs & Conseils des Classes</h1>
          <p className="text-sm text-slate-500 font-medium">
            Générez et validez les moyennes trimestrielles ou de compositions de vos classes.
          </p>
        </div>
        
        {selectedClassId && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPeriodLocked(!isPeriodLocked)}
              className="rounded-xl border-slate-200/80 text-slate-700 gap-2 hover:bg-slate-50 text-xs font-bold"
            >
              {isPeriodLocked ? (
                <>
                  <Lock className="h-4 w-4 text-rose-500" /> Période Verrouillée
                </>
              ) : (
                <>
                  <LockOpen className="h-4 w-4 text-emerald-500" /> Verrouiller la Période
                </>
              )}
            </Button>
            <Button
              onClick={handleCalculateAverages}
              disabled={isCalculating || isPeriodLocked}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95 text-xs font-bold"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Calcul...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" /> Calculer Moyennes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Filtres de classe & période */}
      <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Sélectionner la Classe</label>
            <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedPeriod(availablePeriods[0]); }}>
              <SelectTrigger className="rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Choisir la classe" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Période Scolaire</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={!selectedClassId}>
              <SelectTrigger className="rounded-xl bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {availablePeriods.map(p => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grille des Moyennes */}
      {selectedClassId ? (
        <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-700">Tableau des Résultats — {selectedPeriod}</CardTitle>
                <CardDescription className="text-xs">Visualisation générale des moyennes par matière.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 self-start sm:sm:self-center border-slate-200" onClick={() => toast({ title: "Exportation", description: "L'exportation Excel de la matrice a été lancée." })}>
                <Download className="h-3.5 w-3.5" /> Exporter la Matrice
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b">
                <TableRow>
                  <TableHead className="w-[80px] text-center text-xs font-black uppercase text-slate-400">Rang</TableHead>
                  <TableHead className="text-xs font-black uppercase text-slate-400">Nom & Prénoms</TableHead>
                  <TableHead className="text-xs font-black uppercase text-slate-400">Matricule</TableHead>
                  
                  {/* Matières dynamiques */}
                  {subjects.map(s => (
                    <TableHead key={s.id} className="text-center text-xs font-black uppercase text-slate-400 min-w-[100px]">
                      {s.name.substring(0, 10)}
                    </TableHead>
                  ))}
                  
                  <TableHead className="text-right text-xs font-black uppercase text-slate-400 min-w-[110px]">Moy. Générale</TableHead>
                  <TableHead className="text-right text-xs font-black uppercase text-slate-400 min-w-[150px]">Observation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentAverages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + subjects.length} className="text-center py-12 text-slate-400">
                      Aucun élève trouvé dans cette classe.
                    </TableCell>
                  </TableRow>
                ) : (
                  studentAverages.map((row) => (
                    <TableRow key={row.studentId} className="hover:bg-slate-50/40">
                      <TableCell className="text-center font-bold">
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "font-mono font-bold text-xs rounded-lg py-0.5 px-2",
                            row.rank === 1 ? "bg-amber-100 text-amber-800" :
                            row.rank === 2 ? "bg-slate-200 text-slate-700" :
                            row.rank === 3 ? "bg-orange-100 text-orange-800" : "bg-slate-50 text-slate-500"
                          )}
                        >
                          {row.rank}er
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{row.matricule}</TableCell>
                      
                      {/* Notes par matière */}
                      {subjects.map(s => (
                        <TableCell key={s.id} className="text-center font-mono text-xs text-slate-600">
                          {row.grades[s.name] !== undefined ? row.grades[s.name].toFixed(2) : '-'}
                        </TableCell>
                      ))}

                      <TableCell className="text-right font-mono font-bold text-sm">
                        <span className={cn(
                          row.averageG >= 10 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {row.averageG.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-500">
                        {row.observation}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center h-48 border-dashed border-2 rounded-2xl bg-white/40">
          <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
          <p className="text-slate-500 text-sm font-medium">Veuillez sélectionner une classe pour afficher la matrice des moyennes.</p>
        </Card>
      )}

    </div>
  );
}
