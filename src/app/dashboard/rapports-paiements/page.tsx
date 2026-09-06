'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Printer,
  Calendar,
  Layers,
  TrendingUp,
  Coins,
  FileDown,
  Loader2,
  CalendarClock
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { useSchoolData } from '@/hooks/use-school-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { student as Student, niveau as Niveau, class_type as Class, accountingTransaction as Transaction } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PaymentReportsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

  const currentYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Requête des élèves
  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const students = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

  // Requête de tous les élèves (incluant radiés pour l'historique)
  const allStudentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const { data: allStudentsData, loading: allStudentsLoading } = useCollection(allStudentsQuery);
  const allStudents = useMemo(() => allStudentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [allStudentsData]);

  // Requête des niveaux
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);

  // Requête de TOUTES les transactions de revenus (pour l'historique global)
  const allRevenuesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/comptabilite`), where('type', '==', 'Revenu')) : null, [firestore, schoolId]);
  const { data: allRevenuesData, loading: allRevenuesLoading } = useCollection(allRevenuesQuery);
  const allRevenues = useMemo(() => {
    return allRevenuesData?.map(d => ({ id: d.id, ...d.data() } as Transaction & { id: string })) || [];
  }, [allRevenuesData]);

  // Filtrer les transactions du jour
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayTransactions = useMemo(() => {
    return allRevenues.filter(t => t.date === todayStr);
  }, [allRevenues, todayStr]);

  // Calcul du total encaissé aujourd'hui
  const totalToday = useMemo(() => {
    return todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [todayTransactions]);

  // Calcul du rapport par niveau (sur les actifs)
  const reportByLevel = useMemo(() => {
    return niveaux.map(n => {
      const levelStudents = students.filter(s => s.grade === n.name);
      let expected = 0;
      let remaining = 0;
      levelStudents.forEach(s => {
        expected += (s.tuitionFee || 0);
        remaining += (s.amountDue || 0);
      });
      const collected = expected - remaining;
      const rate = expected > 0 ? (collected / expected) * 100 : 0;
      return { levelName: n.name, count: levelStudents.length, expected, collected, remaining, rate };
    }).filter(r => r.count > 0);
  }, [niveaux, students]);

  // Agrégation par Année Scolaire
  const byYear = useMemo(() => {
    const map = new Map<string, number>();
    allRevenues.forEach(t => {
      const year = t.academicYear || 'Non défini';
      map.set(year, (map.get(year) || 0) + t.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allRevenues]);

  // Agrégation par Période (Mois)
  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    allRevenues.forEach(t => {
      if (!t.date) return;
      const monthYear = format(new Date(t.date), 'MMMM yyyy', { locale: fr });
      map.set(monthYear, (map.get(monthYear) || 0) + t.amount);
    });
    // Trier par date décroissante
    return Array.from(map.entries());
  }, [allRevenues]);

  // Agrégation par Classe
  const byClass = useMemo(() => {
    const map = new Map<string, number>();
    allRevenues.forEach(t => {
      let className = 'Inconnue';
      if (t.studentId) {
        const student = allStudents.find(s => s.id === t.studentId);
        if (student) {
          if (t.academicYear && student.enrollments) {
            const enrollment = student.enrollments.find(e => e.academicYear === t.academicYear);
            if (enrollment) className = (enrollment as any).className || enrollment.classId;
            else className = student.class || student.classId || 'Inconnue';
          } else {
            className = student.class || student.classId || 'Inconnue';
          }
        }
      }
      map.set(className, (map.get(className) || 0) + t.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]); // Tri par montant décroissant
  }, [allRevenues, allStudents]);


  // Impression
  const handlePrintDailyClosing = () => {
    window.print();
    toast({ title: "Impression", description: "L'état de clôture journalière a été envoyé à l'imprimante." });
  };
  const handlePrintBalanceSheet = () => {
    window.print();
    toast({ title: "Impression", description: "L'état de balance des restes à payer a été généré." });
  };

  const isLoading = schoolLoading || allStudentsLoading || niveauxLoading || allRevenuesLoading;

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
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rapports Financiers & Encaissements</h1>
        <p className="text-sm text-slate-500 font-medium">
          Consultez les balances de caisse journalières, annuelles, par période et par classe.
        </p>
      </div>

      <Tabs defaultValue="entrées-jour" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-slate-100 rounded-xl p-1 inline-flex whitespace-nowrap min-w-max">
            <TabsTrigger value="entrées-jour" className="rounded-lg text-xs font-bold px-4 py-2">
              Entrées du jour
            </TabsTrigger>
            <TabsTrigger value="par-niveau" className="rounded-lg text-xs font-bold px-4 py-2">
              Restes à recouvrer (Niveaux)
            </TabsTrigger>
            <TabsTrigger value="par-annee" className="rounded-lg text-xs font-bold px-4 py-2">
              Par Année Scolaire
            </TabsTrigger>
            <TabsTrigger value="par-periode" className="rounded-lg text-xs font-bold px-4 py-2">
              Par Période (Mois)
            </TabsTrigger>
            <TabsTrigger value="par-classe" className="rounded-lg text-xs font-bold px-4 py-2">
              Par Classe
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ONGLET 1: Entrées du jour */}
        <TabsContent value="entrées-jour" className="space-y-6 focus-visible:ring-0 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60 w-full sm:max-w-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Encaissé Aujourd&apos;hui</p>
                  <h3 className="text-2xl font-black text-emerald-600 tracking-tight mt-1 font-mono">{formatCurrency(totalToday)}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{todayTransactions.length} transactions enregistrées</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Coins className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handlePrintDailyClosing}
              disabled={todayTransactions.length === 0}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95 self-start sm:self-center"
            >
              <Printer className="h-4 w-4" /> Imprimer la Clôture du Jour
            </Button>
          </div>

          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Reçu N°</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Élève</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Classe</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Description</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Montant (F)</TableHead>
                    <TableHead className="w-[80px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                        Aucune entrée enregistrée aujourd&apos;hui.
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayTransactions.map(t => {
                      const student = allStudents.find(s => s.id === t.studentId);
                      return (
                        <TableRow key={t.id} className="hover:bg-slate-50/40">
                          <TableCell className="font-mono text-xs font-bold text-slate-500">
                            {t.id?.substring(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">
                            {student ? `${student.lastName} ${student.firstName}` : 'Élève Externe'}
                          </TableCell>
                          <TableCell className="font-medium text-slate-600">{student?.class || 'N/A'}</TableCell>
                          <TableCell className="text-xs text-slate-600">{t.description}</TableCell>
                          <TableCell className="font-mono font-bold text-slate-900">{formatCurrency(t.amount)}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-50 rounded-xl h-8 w-8">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET 2: Par niveau scolaire */}
        <TabsContent value="par-niveau" className="space-y-6 focus-visible:ring-0 mt-4">
          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Rapport de Scolarités par Niveau (Année en cours)</CardTitle>
                <CardDescription>Bilan des inscrits actifs et montants restants à recouvrer.</CardDescription>
              </div>
              <Button onClick={handlePrintBalanceSheet} variant="outline" className="rounded-xl border-slate-200/80 gap-2">
                <FileDown className="h-4 w-4" /> Restes à Payer
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Niveau Scolaire</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Inscrits</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Montant Attendu</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Encaissé</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Reste à Recouvrer</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Recouvrement %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportByLevel.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">Aucun niveau enregistré.</TableCell></TableRow>
                  ) : (
                    reportByLevel.map(row => (
                      <TableRow key={row.levelName} className="hover:bg-slate-50/40">
                        <TableCell className="font-bold text-slate-900">{row.levelName}</TableCell>
                        <TableCell className="font-semibold text-slate-600">{row.count}</TableCell>
                        <TableCell className="font-mono text-slate-600">{formatCurrency(row.expected)}</TableCell>
                        <TableCell className="font-mono text-emerald-600 font-semibold">{formatCurrency(row.collected)}</TableCell>
                        <TableCell className="font-mono text-rose-600 font-semibold">{formatCurrency(row.remaining)}</TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">{row.rate.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET 3: Par Année Scolaire */}
        <TabsContent value="par-annee" className="mt-4 focus-visible:ring-0 space-y-6">
          <Card className="rounded-2xl border-none shadow-md bg-white/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Encaissements par Année Scolaire</CardTitle>
              <CardDescription>Cumul historique des revenus de l'école.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-xs text-slate-400">Année Scolaire</TableHead>
                    <TableHead className="text-right font-black uppercase tracking-widest text-xs text-slate-400">Total Encaissé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byYear.map(([year, amount]) => (
                    <TableRow key={year} className="hover:bg-slate-50/40">
                      <TableCell className="font-bold text-slate-700">{year}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">{formatCurrency(amount)}</TableCell>
                    </TableRow>
                  ))}
                  {byYear.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-slate-400 h-24">Aucune donnée disponible</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET 4: Par Période */}
        <TabsContent value="par-periode" className="mt-4 focus-visible:ring-0 space-y-6">
          <Card className="rounded-2xl border-none shadow-md bg-white/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Encaissements par Période (Mois)</CardTitle>
              <CardDescription>Répartition mensuelle des paiements reçus.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-xs text-slate-400">Mois</TableHead>
                    <TableHead className="text-right font-black uppercase tracking-widest text-xs text-slate-400">Total Encaissé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byMonth.map(([month, amount]) => (
                    <TableRow key={month} className="hover:bg-slate-50/40">
                      <TableCell className="font-bold text-slate-700 capitalize">{month}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">{formatCurrency(amount)}</TableCell>
                    </TableRow>
                  ))}
                  {byMonth.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-slate-400 h-24">Aucune donnée disponible</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET 5: Par Classe */}
        <TabsContent value="par-classe" className="mt-4 focus-visible:ring-0 space-y-6">
          <Card className="rounded-2xl border-none shadow-md bg-white/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Encaissements par Classe</CardTitle>
              <CardDescription>Top des classes générant le plus de revenus (tout historique confondu).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-xs text-slate-400">Classe</TableHead>
                    <TableHead className="text-right font-black uppercase tracking-widest text-xs text-slate-400">Total Encaissé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byClass.map(([className, amount]) => (
                    <TableRow key={className} className="hover:bg-slate-50/40">
                      <TableCell className="font-bold text-slate-700">{className}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">{formatCurrency(amount)}</TableCell>
                    </TableRow>
                  ))}
                  {byClass.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-slate-400 h-24">Aucune donnée disponible</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
