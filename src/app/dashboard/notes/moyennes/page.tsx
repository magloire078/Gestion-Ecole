'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Calculator,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useClasses } from '@/hooks/use-classes';
import { useSubjects } from '@/hooks/use-subjects';
import { ReportCardService } from '@/services/report-card-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { student as Student, academicPeriod as AcademicPeriod } from '@/lib/data-types';

interface ClassResults {
  studentRanks: Record<string, { rank: number; average: number; totalCoef: number }>;
  studentSubjectAverages: Record<string, { subject: string; average: number; coefficient: number }[]>;
  totalStudents: number;
}

function observationFor(average: number): string {
  if (average >= 16) return "Excellent (Félicitations)";
  if (average >= 14) return "Très Bien (Tableau d'Honneur)";
  if (average >= 12) return 'Assez Bien (Encouragements)';
  if (average >= 10) return 'Passable';
  return 'Avertissement travail';
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export default function AveragesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<ClassResults | null>(null);

  // Classes de l'année scolaire courante uniquement.
  const { classes, loading: classesLoading } = useClasses(schoolId);
  const { subjects, loading: subjectsLoading } = useSubjects(schoolId);

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

  const selectedClassInfo = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  // Périodes réellement configurées pour l'école (Paramètres > Année Scolaire), pas une liste devinée.
  const academicPeriods: AcademicPeriod[] = schoolData?.academicPeriods || [];

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    setResults(null);
    if (!selectedPeriod && academicPeriods.length > 0) {
      setSelectedPeriod(academicPeriods[0].name);
    }
  };

  const handleSelectPeriod = (periodName: string) => {
    setSelectedPeriod(periodName);
    setResults(null);
  };

  const handleCalculateAverages = async () => {
    if (!schoolId || !selectedClassId) return;
    const period = academicPeriods.find(p => p.name === selectedPeriod);
    if (!period) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Sélectionnez une période académique valide.' });
      return;
    }

    setIsCalculating(true);
    try {
      const reportService = new ReportCardService(firestore);
      const stats = await reportService.getClassStatistics(schoolId, selectedClassId, period.startDate, period.endDate);
      setResults(stats);
      toast({
        title: 'Calcul terminé',
        description: `Les moyennes de ${selectedClassInfo?.name} pour ${selectedPeriod} ont été recalculées à partir des notes saisies.`,
      });
    } catch (error) {
      console.error('[Moyennes] calculation failed', error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Échec du calcul des moyennes.' });
    } finally {
      setIsCalculating(false);
    }
  };

  const rows = useMemo(() => {
    if (!results) return [];
    const list = students.map(student => {
      const rank = results.studentRanks[student.id];
      const subjectAverages = results.studentSubjectAverages[student.id] || [];
      const grades: Record<string, number> = {};
      subjectAverages.forEach(sa => { grades[sa.subject] = sa.average; });
      return {
        studentId: student.id,
        name: `${student.lastName} ${student.firstName}`,
        matricule: student.matricule || student.id.substring(0, 8),
        grades,
        averageG: rank?.average ?? 0,
        rank: rank?.rank ?? null,
        observation: rank ? observationFor(rank.average) : '—',
      };
    });
    list.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    return list;
  }, [results, students]);

  const handleExportMatrix = () => {
    if (!results || rows.length === 0) {
      toast({ variant: 'destructive', title: 'Rien à exporter', description: 'Calculez les moyennes avant d\'exporter.' });
      return;
    }
    const headers = ['Rang', 'Nom & Prénoms', 'Matricule', ...subjects.map(s => s.name), 'Moyenne Générale', 'Observation'];
    const lines = [headers.map(csvEscape).join(';')];
    rows.forEach(row => {
      const cells = [
        row.rank ?? '',
        row.name,
        row.matricule,
        ...subjects.map(s => row.grades[s.name] !== undefined ? row.grades[s.name].toFixed(2) : ''),
        row.averageG.toFixed(2),
        row.observation,
      ];
      lines.push(cells.map(csvEscape).join(';'));
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Moyennes_${(selectedClassInfo?.name || 'classe').replace(/\s+/g, '_')}_${selectedPeriod.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
            Moyennes calculées à partir des notes réellement saisies pour la période sélectionnée.
          </p>
        </div>

        {selectedClassId && (
          <Button
            onClick={handleCalculateAverages}
            disabled={isCalculating || !selectedPeriod}
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
        )}
      </div>

      {/* Filtres de classe & période */}
      <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Sélectionner la Classe</label>
            <Select value={selectedClassId} onValueChange={handleSelectClass}>
              <SelectTrigger className="rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Choisir la classe" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id!}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Période Scolaire</label>
            <Select value={selectedPeriod} onValueChange={handleSelectPeriod} disabled={!selectedClassId}>
              <SelectTrigger className="rounded-xl bg-white border-slate-200">
                <SelectValue placeholder={academicPeriods.length === 0 ? 'Aucune période configurée' : 'Choisir une période'} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {academicPeriods.map(p => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {academicPeriods.length === 0 && (
              <p className="text-xs text-amber-600">Configurez d&apos;abord les périodes académiques dans Paramètres &gt; Année Scolaire.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grille des Moyennes */}
      {selectedClassId ? (
        <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-700">Tableau des Résultats — {selectedPeriod || '—'}</CardTitle>
                <CardDescription className="text-xs">
                  {results ? 'Visualisation générale des moyennes par matière.' : 'Cliquez sur "Calculer Moyennes" pour afficher les résultats.'}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 self-start sm:self-center border-slate-200" onClick={handleExportMatrix}>
                <Download className="h-3.5 w-3.5" /> Exporter la Matrice (CSV)
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
                {studentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5 + subjects.length} className="text-center py-12 text-slate-400">
                      Chargement des élèves…
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + subjects.length} className="text-center py-12 text-slate-400">
                      Aucun élève trouvé dans cette classe.
                    </TableCell>
                  </TableRow>
                ) : !results ? (
                  <TableRow>
                    <TableCell colSpan={5 + subjects.length} className="text-center py-12 text-slate-400">
                      {students.length} élève{students.length > 1 ? 's' : ''} dans cette classe — lancez le calcul pour voir les moyennes.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.studentId} className="hover:bg-slate-50/40">
                      <TableCell className="text-center font-bold">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'font-mono font-bold text-xs rounded-lg py-0.5 px-2',
                            row.rank === 1 ? 'bg-amber-100 text-amber-800' :
                            row.rank === 2 ? 'bg-slate-200 text-slate-700' :
                            row.rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'
                          )}
                        >
                          {row.rank ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{row.matricule}</TableCell>

                      {subjects.map(s => (
                        <TableCell key={s.id} className="text-center font-mono text-xs text-slate-600">
                          {row.grades[s.name] !== undefined ? row.grades[s.name].toFixed(2) : '-'}
                        </TableCell>
                      ))}

                      <TableCell className="text-right font-mono font-bold text-sm">
                        <span className={cn(row.averageG >= 10 ? 'text-emerald-600' : 'text-rose-600')}>
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
