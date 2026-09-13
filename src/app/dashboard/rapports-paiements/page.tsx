'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useStudents } from '@/hooks/use-students';
import {
  Printer,
  Calendar,
  Layers,
  TrendingUp,
  Coins,
  FileDown,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { useSchoolData } from '@/hooks/use-school-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { niveau as Niveau, accountingTransaction as Transaction, payment as Payment } from '@/lib/data-types';
import { PointFinancierClasse } from '@/components/rapports/point-financier-classe';
import { AccountingReportsService } from '@/services/accounting-reports-service';
import { BillingService } from '@/services/billing-service';

export default function PaymentReportsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

  const currentYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Élèves actifs pour l'année sélectionnée, filtrés via inscriptions_classe /
  // enrollments[] (comme le reste de l'application) plutôt que sur le seul
  // statut "Actif", qui ne reflète pas fidèlement l'inscription réelle pour
  // l'année en cours.
  const { students, loading: studentsLoading } = useStudents(schoolId, undefined, 'active', currentYear);

  // Requête des niveaux (pour l'affichage statistique)
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);

  // Requête des transactions de type 'Revenu' pour aujourd'hui
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayTransactionsQuery = useMemo(() => {
    return schoolId 
      ? query(
          collection(firestore, `ecoles/${schoolId}/comptabilite`),
          where('type', '==', 'Revenu'),
          where('date', '==', todayStr)
        )
      : null;
  }, [firestore, schoolId, todayStr]);
  const { data: todayTransactionsData, loading: todayTransactionsLoading } = useCollection(todayTransactionsQuery);
  const todayTransactions = useMemo(() => {
    return todayTransactionsData?.map(d => ({ id: d.id, ...d.data() } as Transaction & { id: string })) || [];
  }, [todayTransactionsData]);

  // Calcul du total encaissé aujourd'hui
  const totalToday = useMemo(() => {
    return todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [todayTransactions]);

  // Calcul du rapport par niveau
  const reportByLevel = useMemo(() => {
    return niveaux.map(n => {
      // Filtrer les élèves appartenant à ce niveau
      const levelStudents = students.filter(s => s.grade === n.name);
      
      let expected = 0;
      let remaining = 0;
      
      levelStudents.forEach(s => {
        expected += (s.tuitionFee || 0);
        remaining += (s.amountDue || 0);
      });

      const collected = expected - remaining;
      const rate = expected > 0 ? (collected / expected) * 100 : 0;

      return {
        levelName: n.name,
        count: levelStudents.length,
        expected,
        collected,
        remaining,
        rate
      };
    }).filter(r => r.count > 0); // Ne garder que les niveaux ayant des élèves inscrits
  }, [niveaux, students]);

  const studentNameById = useMemo(() => {
    const map: Record<string, { name: string; className: string }> = {};
    students.forEach(s => {
      if (!s.id) return;
      map[s.id] = { name: `${s.lastName} ${s.firstName}`, className: s.class || 'N/A' };
    });
    return map;
  }, [students]);

  // Génère le PDF de clôture journalière (grand livre du jour)
  const handlePrintDailyClosing = () => {
    if (!schoolData || todayTransactions.length === 0) return;
    AccountingReportsService.generateGrandLivrePDF(
      schoolData as any,
      todayTransactions,
      `Journée du ${new Date().toLocaleDateString('fr-FR')}`,
      "CLÔTURE DE CAISSE DU JOUR"
    );
    toast({ title: "Document généré", description: "L'état de clôture journalière a été téléchargé." });
  };

  // Génère le PDF de la balance des restes à payer par niveau
  const handlePrintBalanceSheet = () => {
    if (!schoolData || reportByLevel.length === 0) return;
    AccountingReportsService.generateBalanceNiveauPDF(schoolData as any, reportByLevel, currentYear);
    toast({ title: "Document généré", description: "La balance des restes à payer a été téléchargée." });
  };

  // Génère le PDF listant les reçus émis aujourd'hui
  const handlePrintReceiptsList = () => {
    if (!schoolData || todayTransactions.length === 0) return;
    AccountingReportsService.generateReceiptsListPDF(
      schoolData as any,
      todayTransactions,
      studentNameById,
      `Journée du ${new Date().toLocaleDateString('fr-FR')}`
    );
    toast({ title: "Document généré", description: "La liste des reçus a été téléchargée." });
  };

  // Réimprime le reçu officiel d'une transaction donnée
  const handleReprintReceipt = async (t: Transaction & { id: string }) => {
    if (!schoolId || !schoolData) return;
    if (!t.studentId) {
      toast({ variant: "destructive", title: "Impossible", description: "Cette transaction n'est liée à aucun élève." });
      return;
    }
    const student = students.find(s => s.id === t.studentId);
    if (!student) {
      toast({ variant: "destructive", title: "Impossible", description: "Élève introuvable." });
      return;
    }
    try {
      const paymentsSnap = await getDocs(query(
        collection(firestore, `ecoles/${schoolId}/eleves/${t.studentId}/paiements`),
        where('accountingTransactionId', '==', t.id),
        limit(1)
      ));
      if (paymentsSnap.empty) {
        toast({ variant: "destructive", title: "Impossible", description: "Aucun paiement lié à cette transaction n'a été trouvé." });
        return;
      }
      const payment = { id: paymentsSnap.docs[0].id, ...paymentsSnap.docs[0].data() } as Payment & { id: string };
      BillingService.generateReceiptPDF(schoolData as any, student, payment, schoolData?.mainLogoUrl);
    } catch (error) {
      console.error("Erreur lors de la réimpression du reçu:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de régénérer le reçu." });
    }
  };

  const isLoading = schoolLoading || studentsLoading || niveauxLoading || todayTransactionsLoading;

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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rapports Financiers & Encaissements</h1>
        <p className="text-sm text-slate-500 font-medium">
          Consultez les balances de caisse journalières et la balance des restes à payer par niveau scolaire.
        </p>
      </div>

      <Tabs defaultValue="entrées-jour" className="w-full">
        <TabsList className="bg-slate-100 rounded-xl p-1 mb-4 self-start">
          <TabsTrigger value="entrées-jour" className="rounded-lg text-xs font-bold px-4 py-2">
            Entrées du jour (Clôture)
          </TabsTrigger>
          <TabsTrigger value="par-niveau" className="rounded-lg text-xs font-bold px-4 py-2">
            Par niveau scolaire
          </TabsTrigger>
          <TabsTrigger value="par-classe" className="rounded-lg text-xs font-bold px-4 py-2">
            Par classe (détail élèves)
          </TabsTrigger>
        </TabsList>

        {/* ONGLET 1: Entrées du jour */}
        <TabsContent value="entrées-jour" className="space-y-6 focus-visible:ring-0">
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
                      const student = students.find(s => s.id === t.studentId);
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-600 hover:bg-slate-50 rounded-xl h-8 w-8"
                              onClick={() => handleReprintReceipt(t)}
                              title="Réimprimer le reçu"
                            >
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
        <TabsContent value="par-niveau" className="space-y-6 focus-visible:ring-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-700">Rapport de Scolarités par Niveau</h3>
              <p className="text-xs text-slate-500 font-medium">Bilan global des inscriptions, versements perçus et restants à recouvrer.</p>
            </div>
            <div className="flex gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                onClick={handlePrintBalanceSheet}
                disabled={reportByLevel.length === 0}
                className="rounded-xl border-slate-200/80 hover:bg-slate-50 text-slate-700 gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <FileDown className="h-4 w-4" /> Restes à Payer
              </Button>
              <Button
                onClick={handlePrintReceiptsList}
                disabled={todayTransactions.length === 0}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Printer className="h-4 w-4" /> Liste des Reçus
              </Button>
            </div>
          </div>

          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
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
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                        Aucun niveau scolaire avec des élèves actifs n&apos;est enregistré.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportByLevel.map(row => (
                      <TableRow key={row.levelName} className="hover:bg-slate-50/40">
                        <TableCell className="font-bold text-slate-900">{row.levelName}</TableCell>
                        <TableCell className="font-semibold text-slate-600">{row.count}</TableCell>
                        <TableCell className="font-mono text-slate-600">{formatCurrency(row.expected)}</TableCell>
                        <TableCell className="font-mono text-emerald-600 font-semibold">{formatCurrency(row.collected)}</TableCell>
                        <TableCell className="font-mono text-rose-600 font-semibold">{formatCurrency(row.remaining)}</TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {row.rate.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET 3: Point financier par classe (état détaillé élève par élève) */}
        <TabsContent value="par-classe" className="space-y-4 focus-visible:ring-0">
          <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Point financier par classe</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">État détaillé par élève : scolarité totale, versé, reste et statut de règlement.</p>
          </div>
          <PointFinancierClasse students={students} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
