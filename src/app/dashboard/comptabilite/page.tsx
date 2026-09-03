'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Scale,
  Mail,
  FileText,
  Loader2,
  Calendar,
  Wallet
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";
import type { accountingTransaction as AccountingTransaction } from '@/lib/data-types';
import { AccountingCharts } from './charts';
import { cn } from "@/lib/utils";
import { TransactionForm } from "@/components/comptabilite/transaction-form";
import { AccountingReportsService } from "@/services/accounting-reports-service";
import { formatCurrency } from "@/lib/currency-utils";
import { useAcademicYear } from "@/providers/academic-year-provider";
import { filterByAcademicYear } from "@/lib/academic-year-utils";

export default function AccountingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, schoolName, schoolData, loading: schoolLoading } = useSchoolData();
  const canManageBilling = !!user?.profile?.permissions?.manageBilling || user?.profile?.role === 'directeur' || user?.profile?.isSuperAdmin;
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingGrandLivre, setIsGeneratingGrandLivre] = useState(false);
  const [isGeneratingBilan, setIsGeneratingBilan] = useState(false);

  const transactionsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/comptabilite`), where('schoolId', '==', schoolId)) : null, [firestore, schoolId]);
  const { data: transactionsData, loading: transactionsLoading } = useCollection(transactionsQuery);

  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const { selectedYear, currentYear } = useAcademicYear();

  const transactions = useMemo(() => {
    const all = (transactionsData?.map(d => ({ id: d.id, ...d.data() } as AccountingTransaction & { id: string })) || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return filterByAcademicYear(all, selectedYear, currentYear);
  }, [transactionsData, selectedYear, currentYear]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<(AccountingTransaction & { id: string }) | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<(AccountingTransaction & { id: string }) | null>(null);

  // Filtre par catégorie (Pills)
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous');

  const { toast } = useToast();

  const getTransactionDocRef = (transactionId: string) => doc(firestore, `ecoles/${schoolId}/comptabilite/${transactionId}`);

  const handleOpenFormDialog = (transaction: (AccountingTransaction & { id: string }) | null) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (transaction: (AccountingTransaction & { id: string })) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTransaction = () => {
    if (!schoolId || !transactionToDelete || !transactionToDelete.id) return;
    const transactionDocRef = getTransactionDocRef(transactionToDelete.id);
    deleteDoc(transactionDocRef)
      .then(() => {
        toast({ title: "Transaction supprimée", description: "La transaction a été supprimée." });
        setIsDeleteDialogOpen(false);
        setTransactionToDelete(null);
      }).catch(async (serverError) => {
        console.error("Error deleting transaction:", serverError);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la transaction." });
      });
  };

  const handleSendMonthlyReport = async () => {
    if (!schoolId || !schoolName || !user?.email) {
      toast({
        variant: "destructive",
        title: "Configuration incomplète",
        description: "Impossible d'envoyer le rapport : matricule d'école ou email manquant."
      });
      return;
    }

    setIsGeneratingReport(true);
    try {
      const { ReportService } = await import('@/services/reports');
      const { MailService } = await import('@/services/mail-service');

      const reportService = new ReportService(firestore);
      const mailService = new MailService(firestore);

      const lastMonth = subMonths(new Date(), 1);
      const reportData = await reportService.getMonthlyFinanceData(schoolId, lastMonth);

      const result = await mailService.sendMonthlyFinanceReport(user.email, schoolName, reportData, schoolId);

      if (result.success) {
        toast({
          title: "Rapport envoyé",
          description: `Le rapport de ${reportData.monthName} ${reportData.year} a été envoyé à ${user.email}.`
        });
      } else {
        throw new Error(result.error ? String(result.error) : "Erreur d'envoi inconnue");
      }
    } catch (error) {
      console.error("Report generation/sending failed:", error);
      toast({
        variant: "destructive",
        title: "Échec de l'envoi",
        description: error instanceof Error ? error.message : "Impossible de générer ou d'envoyer le rapport."
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const isLoading = schoolLoading || transactionsLoading || studentsLoading;

  const stats = useMemo(() => {
    const totalRevenu = transactions
      .filter(t => t.type === 'Revenu')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDepense = transactions
      .filter(t => t.type === 'Dépense')
      .reduce((sum, t) => sum + t.amount, 0);
    const solde = totalRevenu - totalDepense;

    const students = studentsData?.map(d => d.data() as any) || [];
    const totalExpected = students.reduce((sum, s) => sum + (s.tuitionFee || 0), 0);
    const totalDue = students.reduce((sum, s) => sum + (s.amountDue || 0), 0);
    const recoveryRate = totalExpected > 0 ? ((totalExpected - totalDue) / totalExpected) * 100 : 0;

    return { totalRevenu, totalDepense, solde, recoveryRate };
  }, [transactions, studentsData]);

  // Liste des catégories pour le filtrage
  const uniqueCategories = useMemo(() => {
    const list = ['Tous'];
    transactions.forEach(t => {
      if (t.category && !list.includes(t.category)) {
        list.push(t.category);
      }
    });
    return list;
  }, [transactions]);

  // Filtrer les transactions
  const filteredTransactions = useMemo(() => {
    if (categoryFilter === 'Tous') return transactions;
    return transactions.filter(t => t.category === categoryFilter);
  }, [transactions, categoryFilter]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Caisse & Suivi des Dépenses</h1>
            <p className="text-sm text-slate-500 font-medium">
              Suivez les entrées, les sorties de caisse et la santé financière de l&apos;établissement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                setIsGeneratingGrandLivre(true);
                setTimeout(() => {
                  AccountingReportsService.generateGrandLivrePDF(schoolData as any, transactions, "Toutes les transactions");
                  setIsGeneratingGrandLivre(false);
                }, 100);
              }}
              disabled={isLoading || transactions.length === 0 || isGeneratingGrandLivre}
              className="rounded-xl border-slate-200/80 text-slate-700 gap-2 hover:bg-slate-50"
            >
              {isGeneratingGrandLivre ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Grand Livre
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setIsGeneratingBilan(true);
                setTimeout(() => {
                  AccountingReportsService.generateBilanPDF(schoolData as any, transactions, "Toutes les transactions");
                  setIsGeneratingBilan(false);
                }, 100);
              }}
              disabled={isLoading || transactions.length === 0 || isGeneratingBilan}
              className="rounded-xl border-slate-200/80 text-slate-700 gap-2 hover:bg-slate-50"
            >
              {isGeneratingBilan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
              Bilan (PDF)
            </Button>
            <Button
              variant="outline"
              onClick={handleSendMonthlyReport}
              disabled={isLoading || isGeneratingReport}
              className="rounded-xl border-slate-200/80 text-slate-700 gap-2 hover:bg-slate-50"
            >
              {isGeneratingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Rapport Email
            </Button>
          </div>
        </div>

        {/* Blocs indicateurs de Caisse Premium */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Encaissé (Entrées)</p>
                <h3 className="text-2xl font-black text-emerald-600 tracking-tight mt-1 font-mono">{formatCurrency(stats.totalRevenu)}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Dépenses (Sorties)</p>
                <h3 className="text-2xl font-black text-rose-600 tracking-tight mt-1 font-mono">{formatCurrency(stats.totalDepense)}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <TrendingDown className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Solde Actuel de Caisse</p>
                <h3 className={cn("text-2xl font-black tracking-tight mt-1 font-mono", stats.solde >= 0 ? 'text-indigo-600' : 'text-rose-600')}>{formatCurrency(stats.solde)}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Wallet className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {!isLoading && transactions.length > 0 && <AccountingCharts transactions={transactions} recoveryRate={stats.recoveryRate} />}

        {/* Boutons de filtrage rapide (Pills) */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl self-start w-fit">
          {uniqueCategories.map(cat => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'ghost'}
              onClick={() => setCategoryFilter(cat)}
              className="rounded-lg text-xs font-bold px-3 py-1.5 h-auto"
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-700">Transactions Récentes</h2>
          {canManageBilling && (
            <Button onClick={() => handleOpenFormDialog(null)} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-2 transition-all hover:scale-105 active:scale-95">
              <PlusCircle className="h-4 w-4" /> Enregistrer une Dépense
            </Button>
          )}
        </div>

        <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b">
                <TableRow>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Date</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Description</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Catégorie</TableHead>
                  <TableHead className="text-right text-xs font-black uppercase tracking-widest text-slate-400">Montant</TableHead>
                  {canManageBilling && <TableHead className="w-[50px] text-right"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                      {canManageBilling && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                    </TableRow>
                  ))
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-slate-50/40">
                      <TableCell className="text-xs text-slate-500 font-mono">{format(new Date(transaction.date), 'd MMM yyyy', { locale: fr })}</TableCell>
                      <TableCell className="font-bold text-slate-900">{transaction.description}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600">{transaction.category}</TableCell>
                      <TableCell className={cn('text-right font-mono font-bold', transaction.type === 'Revenu' ? 'text-emerald-600' : 'text-rose-600')}>
                        {transaction.type === 'Revenu' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </TableCell>
                      {canManageBilling && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl bg-white">
                              <DropdownMenuItem onClick={() => handleOpenFormDialog(transaction)}>Modifier</DropdownMenuItem>
                              <DropdownMenuItem className="text-rose-600" onClick={() => handleOpenDeleteDialog(transaction)}>Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canManageBilling ? 5 : 4} className="h-24 text-center text-slate-400">Aucune transaction trouvée.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-white border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900 tracking-tight">Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La transaction <strong>{transactionToDelete?.description}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">{editingTransaction ? 'Modifier' : 'Saisir'} une Dépense / Sortie</DialogTitle>
            <DialogDescription>Enregistrez un flux financier sortant pour l&apos;établissement.</DialogDescription>
          </DialogHeader>
          <TransactionForm
            schoolId={schoolId!}
            transaction={editingTransaction}
            onSave={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
