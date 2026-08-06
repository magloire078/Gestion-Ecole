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

export default function PaymentsJournalPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

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

    return transactions.filter(t => {
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
  }, [transactions, periodFilter, searchTerm, students]);

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
    const batch = writeBatch(firestore);

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

      const newDue = Math.max(0, currentDue - amount);
      const newStatus = newDue <= 0 ? 'Soldé' : 'Partiel';

      // 1. Mettre à jour le solde sur le dossier de l'élève
      batch.update(studentDocRef, {
        amountDue: newDue,
        tuitionStatus: newStatus,
        updatedAt: new Date().toISOString()
      });

      // 2. Enregistrer le versement dans la sous-collection `paiements` de l'élève
      const payRef = doc(collection(firestore, `ecoles/${schoolId}/eleves/${selectedStudentId}/paiements`));
      const receiptRef = `REC-${Date.now().toString().slice(-6)}`;
      
      batch.set(payRef, {
        schoolId,
        studentId: selectedStudentId,
        date: paymentDate,
        amount: amount,
        description: paymentNotes,
        payerFirstName: studentData.parent1FirstName || 'Parent',
        payerLastName: studentData.parent1LastName || studentData.lastName,
        method: paymentMethod,
        academicYear: currentYear,
        reference: receiptRef,
        createdAt: new Date().toISOString()
      });

      // 3. Enregistrer l'écriture de caisse dans `comptabilite`
      const transRef = doc(collection(firestore, `ecoles/${schoolId}/comptabilite`));
      batch.set(transRef, {
        schoolId,
        date: paymentDate,
        description: `${paymentNotes} - ${studentData.firstName} ${studentData.lastName}`,
        category: 'Scolarité',
        type: 'Revenu',
        amount: amount,
        studentId: selectedStudentId,
        academicYear: currentYear,
        createdAt: new Date().toISOString()
      });

      await batch.commit();

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

    const batch = writeBatch(firestore);
    try {
      // 1. Si la transaction est rattachée à un élève, on rajoute la dette
      if (trans.studentId) {
        const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${trans.studentId}`);
        const studentSnap = await getDoc(studentDocRef);
        
        if (studentSnap.exists()) {
          const studentData = studentSnap.data() as Student;
          const currentDue = studentData.amountDue || 0;
          const newDue = currentDue + (trans.amount || 0);
          
          batch.update(studentDocRef, {
            amountDue: newDue,
            tuitionStatus: 'Partiel',
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Supprimer la transaction de caisse
      const transDocRef = doc(firestore, `ecoles/${schoolId}/comptabilite/${trans.id}`);
      batch.delete(transDocRef);

      await batch.commit();
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
    <div className="space-y-6">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Journal des Paiements & Reçus</h1>
          <p className="text-sm text-slate-500 font-medium">
            Historique complet des versements d&apos;écolage perçus pour l&apos;année {currentYear}.
          </p>
        </div>

        <Button 
          onClick={() => setIsPaymentDialogOpen(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" /> Enregistrer un Versement
        </Button>
      </div>

      {/* Cartes d'indicateurs de trésorerie courante */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Encaissé Aujourd&apos;hui</p>
              <h3 className="text-2xl font-black text-emerald-600 tracking-tight mt-1 font-mono">{formatCurrency(stats.todayCollected)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Clôture journalière</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Encaissé ce Mois</p>
              <h3 className="text-2xl font-black text-indigo-600 tracking-tight mt-1 font-mono">{formatCurrency(stats.monthCollected)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Rapprochement mensuel</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cumul Recouvré (Annuel)</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-mono">{formatCurrency(stats.totalAnnual)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Total perçu en caisse</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'outils (Filtres de période + Recherche) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start">
          <Button 
            variant={periodFilter === 'all' ? 'default' : 'ghost'} 
            onClick={() => setPeriodFilter('all')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-auto"
          >
            Tous les versements
          </Button>
          <Button 
            variant={periodFilter === 'today' ? 'default' : 'ghost'} 
            onClick={() => setPeriodFilter('today')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-auto"
          >
            Aujourd&apos;hui
          </Button>
          <Button 
            variant={periodFilter === 'week' ? 'default' : 'ghost'} 
            onClick={() => setPeriodFilter('week')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-auto"
          >
            Cette semaine
          </Button>
          <Button 
            variant={periodFilter === 'month' ? 'default' : 'ghost'} 
            onClick={() => setPeriodFilter('month')} 
            className="rounded-lg text-xs font-bold px-3 py-1.5 h-auto"
          >
            Ce mois
          </Button>
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher élève, reçu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-xl border-slate-200/80 bg-white"
          />
        </div>
      </div>

      {/* Journal des Reçus */}
      <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b">
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
                      <TableCell className="text-xs text-slate-500 font-mono">{t.date}</TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {student ? `${student.lastName} ${student.firstName}` : 'Élève Externe'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">
                        {student?.class || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{t.description}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-500">
                        Espèce
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-end gap-2 pr-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-600 hover:bg-slate-50 rounded-xl h-8 w-8"
                            onClick={() => toast({ title: "Impression", description: "Le reçu de scolarité est envoyé à l'imprimante." })}
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
