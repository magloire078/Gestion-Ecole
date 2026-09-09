'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import {
  PlusCircle,
  Search,
  Loader2,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  Trash2,
  User,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { useSchoolData } from '@/hooks/use-school-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from "@/components/ui/skeleton";
import type { student as Student, class_type as Class, accountingTransaction as Transaction } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TuitionPaymentService } from '@/services/tuition-payment-service';
import { BillingService } from '@/services/billing-service';
import { useAcademicYear } from '@/providers/academic-year-provider';
import { filterByAcademicYear, resolveAcademicYearForWrite } from '@/lib/academic-year-utils';

export default function PaymentsJournalPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const { currentYear: appCurrentYear, selectedYear } = useAcademicYear();

  // Dialog versement
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Chèque' | 'Virement Bancaire' | 'Paiement Mobile'>('Espèces');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('Versement scolarité');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const currentYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Requête des élèves (pour sélection dans le modal d'encaissement et jointure de noms)
  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const students = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

  // Requête des transactions de caisse (Revenus uniquement)
  const transactionsQuery = useMemo(() => {
    return schoolId 
      ? query(
          collection(firestore, `ecoles/${schoolId}/comptabilite`),
          where('type', '==', 'Revenu')
        )
      : null;
  }, [firestore, schoolId]);
  const { data: transactionsData, loading: transactionsLoading } = useCollection(transactionsQuery);
  const transactions = useMemo(() => {
    const list = transactionsData?.map(d => ({ id: d.id, ...d.data() } as Transaction & { id: string })) || [];
    // Trier chronologiquement (plus récent en premier)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionsData]);

  // Calcul des statistiques de période sur les revenus chargés
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    let todayCollected = 0;
    let monthCollected = 0;
    let totalAnnual = 0;

    transactions.forEach(t => {
      const amount = t.amount || 0;
      const tDate = new Date(t.date);
      
      if (t.date === todayStr) {
        todayCollected += amount;
      }
      if (tDate >= firstDayOfMonth) {
        monthCollected += amount;
      }
      totalAnnual += amount;
    });

    return {
      todayCollected,
      monthCollected,
      totalAnnual
    };
  }, [transactions]);

  // Filtrage selon la période choisie et la recherche
  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Début de semaine (Lundi)
    const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let filtered = transactions.filter(t => {
      // 1. Filtre temporel
      if (periodFilter === 'today' && t.date !== todayStr) return false;
      if (periodFilter === 'week' && new Date(t.date) < firstDayOfWeek) return false;
      if (periodFilter === 'month' && new Date(t.date) < firstDayOfMonth) return false;

      // 2. Filtre de recherche (nom de l'élève ou description)
      if (searchTerm) {
        const studentInfo = students.find(s => s.id === t.studentId);
        const fullName = studentInfo ? `${studentInfo.firstName} ${studentInfo.lastName}`.toLowerCase() : '';
        const search = searchTerm.toLowerCase();
        
        const nameMatch = fullName.includes(search);
        const descMatch = t.description?.toLowerCase().includes(search);
        const classMatch = studentInfo?.class?.toLowerCase().includes(search);
        
        return nameMatch || descMatch || classMatch;
      }

      return true;
    });
    
    // 3. Filtre par année scolaire sélectionnée
    return filterByAcademicYear(filtered, selectedYear, appCurrentYear);
  }, [transactions, periodFilter, searchTerm, students, selectedYear, appCurrentYear]);

  // Saisir un versement
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !selectedStudentId || !paymentAmount || !user) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez saisir un montant supérieur à 0.' });
      return;
    }

    setIsSubmittingPayment(true);
    
    try {
      const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${selectedStudentId}`);
      const studentSnap = await getDoc(studentDocRef);
      
      if (!studentSnap.exists()) {
        throw new Error("L'élève n'existe pas.");
      }

      const studentData = studentSnap.data() as Student;
      const currentDue = studentData.amountDue || 0;

      if (amount > currentDue) {
        toast({
          variant: 'destructive',
          title: 'Montant excessif',
          description: `Le montant versé (${formatCurrency(amount)}) dépasse le solde restant dû (${formatCurrency(currentDue)}).`
        });
        setIsSubmittingPayment(false);
        return;
      }

      const academicYearForPayment = resolveAcademicYearForWrite({
        schoolCurrentYear: (schoolData as any)?.currentAcademicYear,
        docDate: paymentDate,
      });

      const { receiptRef } = await TuitionPaymentService.registerPayment(firestore, schoolId, { ...studentData, id: selectedStudentId } as Student & { id: string }, {
        amount,
        date: paymentDate,
        description: paymentNotes,
        payerFirstName: studentData.parent1FirstName || 'Parent',
        payerLastName: studentData.parent1LastName || studentData.lastName,
        payerContact: studentData.parent1Contact || '',
        method: paymentMethod,
        academicYear: academicYearForPayment
      });

      toast({
        title: "Paiement validé !",
        description: `Reçu ${receiptRef} créé pour un montant de ${formatCurrency(amount)}.`
      });

      // Reset form
      setIsPaymentDialogOpen(false);
      setSelectedStudentId('');
      setPaymentAmount('');
      setPaymentNotes('Versement scolarité');
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Impossible d\'enregistrer le paiement.' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Supprimer/Annuler un paiement
  const handleDeleteTransaction = async (trans: Transaction & { id: string }) => {
    if (!schoolId || !trans.id) return;

    if (!confirm("Voulez-vous vraiment annuler ce versement ? Le montant sera rajouté au reste à payer de l'élève.")) {
      return;
    }

    try {
      await TuitionPaymentService.cancelPayment(firestore, schoolId, {
        id: trans.id,
        schoolId: schoolId,
        studentId: trans.studentId!,
        date: trans.date,
        amount: trans.amount,
        method: (trans as any).method || 'Espèces',
      });
      toast({ title: "Versement annulé !", description: "Le montant a été débité et la dette de l'élève a été réajustée." });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'annuler ce versement.' });
    }
  };

  const isLoading = schoolLoading || transactionsLoading || studentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 print:m-0 print:p-0 print:w-full">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/60 dark:border-slate-800/60 shadow-sm print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">
              Finance & Trésorerie
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
            Journal des Paiements & Reçus
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Historique complet des versements d&apos;écolage perçus pour l&apos;année {currentYear}.
          </p>
        </div>

        <Button 
          onClick={() => setIsPaymentDialogOpen(true)}
          className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-all duration-200 hover:scale-105 active:scale-95 font-bold h-11 px-5"
        >
          <PlusCircle className="h-4 w-4" /> Enregistrer un Versement
        </Button>
      </div>

      {/* Cartes d'indicateurs de trésorerie courante */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 print:hidden">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Encaissé Aujourd&apos;hui</p>
            <h3 className="text-lg sm:text-2xl font-black text-emerald-600 tracking-tight font-mono tabular-nums truncate">
              {formatCurrency(stats.todayCollected)}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Clôture journalière</p>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Encaissé ce Mois</p>
            <h3 className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-mono tabular-nums truncate">
              {formatCurrency(stats.monthCollected)}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Rapprochement mensuel</p>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
            <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Cumul Recouvré (Annuel)</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono tabular-nums truncate">
              {formatCurrency(stats.totalAnnual)}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Total perçu en caisse</p>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 ml-2">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </div>

      {/* Barre d'outils (Filtres de période + Recherche) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/40 dark:border-slate-800/40 shadow-sm print:hidden">
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto w-full sm:w-auto">
          <Button 
            variant={periodFilter === 'all' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setPeriodFilter('all')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-8 shrink-0"
          >
            Tous les versements
          </Button>
          <Button 
            variant={periodFilter === 'today' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setPeriodFilter('today')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-8 shrink-0"
          >
            Aujourd&apos;hui
          </Button>
          <Button 
            variant={periodFilter === 'week' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setPeriodFilter('week')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-8 shrink-0"
          >
            Cette semaine
          </Button>
          <Button 
            variant={periodFilter === 'month' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setPeriodFilter('month')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-8 shrink-0"
          >
            Ce mois
          </Button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher élève, classe, reçu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 rounded-xl border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Vue Mobile (Cartes de versements) */}
      <div className="block md:hidden space-y-3 print:hidden">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-8 text-center text-slate-400 text-sm">
            Aucun versement enregistré sur cette période.
          </div>
        ) : (
          filteredTransactions.map((t) => {
            const student = students.find(s => s.id === t.studentId);
            const method = (t as any).method || 'Espèce';
            return (
              <div 
                key={t.id}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">
                      {student ? `${student.lastName} ${student.firstName}` : 'Élève Externe'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Classe : <span className="font-semibold text-slate-700 dark:text-slate-300">{student?.class || 'N/A'}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                    {method}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md mr-1.5">
                      #{t.id?.substring(0, 6).toUpperCase() || 'N/A'}
                    </span>
                    <span>{t.date ? format(new Date(t.date), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                </div>

                {t.description && (
                  <p className="text-xs text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-xl">
                    {t.description}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl h-8 px-3 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                       if (student) {
                           BillingService.generateReceiptPDF(schoolData as any, student, t as any, schoolData?.mainLogoUrl);
                       } else {
                           toast({ title: "Action impossible", description: "L'élève n'est pas sélectionnable." });
                       }
                    }}
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-500" /> Reçu PDF
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteTransaction(t)}
                    className="rounded-xl h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    title="Annuler le versement"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Vue Desktop (Tableau des Reçus) */}
      <Card className="hidden md:block rounded-2xl border-none shadow-md overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b">
              <TableRow>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Reçu N°</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Date</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Élève</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Classe</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Description</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Règlement</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Montant (F)</TableHead>
                <TableHead className="w-[100px] text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    Aucun versement enregistré sur cette période.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => {
                  const student = students.find(s => s.id === t.studentId);
                  return (
                    <TableRow key={t.id} className="hover:bg-slate-50/40">
                      <TableCell className="font-mono text-xs font-bold text-slate-500">
                        {t.id?.substring(0, 8).toUpperCase() || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium capitalize">
                        {t.date ? format(new Date(t.date), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">
                        {student ? `${student.lastName} ${student.firstName}` : 'Élève Externe'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-600 dark:text-slate-300">
                        {student?.class || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">{t.description}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-500">
                        {(t as any).method || 'Espèce'}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-end gap-2 pr-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-600 hover:bg-slate-50 rounded-xl h-8 w-8"
                            onClick={() => {
                               if (student) {
                                   BillingService.generateReceiptPDF(schoolData as any, student, t as any, schoolData?.mainLogoUrl);
                               } else {
                                   toast({ title: "Action impossible", description: "L'élève n'est pas sélectionnable." });
                               }
                            }}
                            title="Imprimer le reçu"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteTransaction(t)}
                            className="text-rose-600 hover:bg-rose-50 rounded-xl h-8 w-8"
                            title="Annuler le versement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal d'Encaissement de Versement Rapide */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Saisir un Versement d&apos;Écolage</DialogTitle>
            <DialogDescription>Enregistrez le règlement d&apos;un élève en cours d&apos;année.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterPayment} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Élève Débiteur *</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Rechercher et choisir l'élève" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id!}>
                      {s.lastName} {s.firstName} ({s.class}) - Reste: {formatCurrency(s.amountDue)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Montant Versé (F) *</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Ex: 50000"
                  className="rounded-xl font-mono text-emerald-600 font-bold"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Date Versement *</Label>
                <Input 
                  type="date" 
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Mode de Règlement</Label>
              <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Espèces">Espèces</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money (Wave/Orange/MTN)</SelectItem>
                  <SelectItem value="Chèque">Chèque</SelectItem>
                  <SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Libellé / Note</Label>
              <Input 
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ex: 2e Versement"
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmittingPayment}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95"
              >
                {isSubmittingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    Enregistrer le Règlement <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
