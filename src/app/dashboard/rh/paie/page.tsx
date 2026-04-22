'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Banknote, Loader2, Files, Users, DollarSign, History } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDoc, doc, orderBy, getDocs } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { useToast } from '@/hooks/use-toast';
import type { staff as Staff, school as School, payrollRun as PayrollRun } from '@/lib/data-types';
import { getPayslipDetails, type PayslipDetails } from '@/lib/bulletin-de-paie';
import { PayslipPreview, BulkPayslipPreview } from '@/components/payroll/payslip-template';
import { PayrollChart } from '@/components/rh/payroll-chart';
import { StatCard } from '@/components/ui/stat-card';
import { PayrollHistoryTable } from '@/components/rh/payroll-history-table';
import { StaffPayrollList } from '@/components/rh/staff-payroll-list';
import { runPayrollForMonth } from '@/services/payroll-services';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency-utils';

interface PayrollRunWithId extends PayrollRun {
  id: string;
}

export default function PaiePage() {
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const canManageBilling = !!user?.profile?.permissions?.manageBilling;
  const { toast } = useToast();

  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [isBulkPayslipOpen, setIsBulkPayslipOpen] = useState(false);
  const [bulkPayslipDetails, setBulkPayslipDetails] = useState<PayslipDetails[] | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);


  const staffQuery = useMemo(() => {
    if (!schoolId) return null;
    return query(collection(firestore, `ecoles/${schoolId}/personnel`), where('status', '==', 'Actif'));
  }, [firestore, schoolId]);

  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const staffWithSalary = useMemo(() => staffData?.map(doc => ({ ...doc.data() as Staff, id: doc.id })) || [], [staffData]);

  const payrollHistoryQuery = useMemo(() =>
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/payroll_runs`), orderBy('executionDate', 'desc')) : null,
    [firestore, schoolId]);
  const { data: payrollHistoryData, loading: payrollHistoryLoading } = useCollection(payrollHistoryQuery);

  const payrollHistory = useMemo(() =>
    payrollHistoryData?.map(doc => ({ id: doc.id, ...doc.data() } as PayrollRunWithId)) || [],
    [payrollHistoryData]);


  const isLoading = schoolLoading || userLoading || staffLoading || payrollHistoryLoading;

  const { totalSalaryMass, averageSalary } = useMemo(() => {
    if (staffWithSalary.length === 0) {
      return { totalSalaryMass: 0, averageSalary: 0 };
    }
    const total = staffWithSalary.reduce((acc, staff) => {
      const salary = staff.contractType === 'Vacataire'
        ? (staff.hourlyRate || 0) * (staff.baseHours || 0)
        : (staff.baseSalary || 0);
      return acc + salary;
    }, 0);
    return {
      totalSalaryMass: total,
      averageSalary: total / staffWithSalary.length,
    };
  }, [staffWithSalary]);

  const handleGeneratePayslip = async (staffMember: Staff & { id: string }) => {
    if (!schoolData) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Données de l\'école non chargées.' });
      return;
    }

    setIsGenerating(true);
    setPayslipDetails(null);
    setIsPayslipOpen(true);

    try {
      const fullStaffDoc = await getDoc(doc(firestore, `ecoles/${schoolId}/personnel/${staffMember.id!}`));
      if (!fullStaffDoc.exists()) throw new Error("Staff member not found");

      const payslipDate = new Date().toISOString();
      const details = await getPayslipDetails(fullStaffDoc.data() as Staff, payslipDate, schoolData as School);
      setPayslipDetails(details);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erreur de génération",
        description: "Impossible de calculer le bulletin de paie. Vérifiez que toutes les données de l'employé sont renseignées.",
      });
      setIsPayslipOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllPayslips = async () => {
    if (!schoolData || staffWithSalary.length === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Aucun personnel avec salaire à traiter ou données de l\'école non chargées.' });
      return;
    }
    setIsBulkGenerating(true);
    setBulkPayslipDetails(null);

    try {
      const payslipDate = new Date().toISOString();
      const allDetailsPromises = staffWithSalary.map(async (staffMember) => {
        const fullStaffDoc = await getDoc(doc(firestore, `ecoles/${schoolId}/personnel/${staffMember.id}`));
        if (fullStaffDoc.exists()) {
          return getPayslipDetails(fullStaffDoc.data() as Staff, payslipDate, schoolData as School);
        }
        return null;
      });

      const allDetails = (await Promise.all(allDetailsPromises)).filter(Boolean) as PayslipDetails[];

      if (allDetails.length === 0) {
        throw new Error("Aucun bulletin n'a pu être généré.");
      }

      setBulkPayslipDetails(allDetails);
      setIsBulkPayslipOpen(true);

    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erreur de génération en masse",
        description: "Impossible de générer tous les bulletins de paie.",
      });
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleViewPayslips = async (run: PayrollRunWithId) => {
    if (!schoolId) return;

    setIsBulkGenerating(true);
    setBulkPayslipDetails(null);
    setIsBulkPayslipOpen(true);

    try {
      const payslipsQuery = query(collection(firestore, `ecoles/${schoolId}/payroll_runs/${run.id}/payslips`));
      const snapshot = await getDocs(payslipsQuery);

      if (snapshot.empty) {
        toast({ variant: 'destructive', title: "Aucun bulletin trouvé", description: "Aucun bulletin de paie n'a été trouvé pour cette exécution." });
        setIsBulkPayslipOpen(false);
        return;
      }

      const allDetails = snapshot.docs.map(doc => doc.data().payslipDetails as PayslipDetails);

      setBulkPayslipDetails(allDetails);

    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les bulletins de paie." });
      setIsBulkPayslipOpen(false);
    } finally {
      setIsBulkGenerating(false);
    }
  };


  const handleRunPayroll = async () => {
    if (!schoolId || !user?.uid || !user.displayName || !schoolData) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'identifier l'école ou l'utilisateur.",
      });
      return;
    }

    setIsProcessingPayroll(true);

    const result = await runPayrollForMonth(firestore, schoolId, user.uid, user.displayName, schoolData as School);

    if (result.success) {
      toast({
        title: "Paie lancée avec succès!",
        description: `Le lot de paie pour ce mois a été enregistré.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Échec du lancement de la paie",
        description: result.error || "Une erreur inconnue est survenue.",
      });
    }

    setIsProcessingPayroll(false);
  };



  return (
    <>
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
              Gestion de la Paie
            </h1>
            <p className="text-slate-500 max-w-2xl text-sm font-medium">
              Pilotez la rémunération de votre personnel, générez les bulletins et suivez la masse salariale.
            </p>
          </div>
          {canManageBilling && (
            <Button 
              size="lg" 
              onClick={handleRunPayroll} 
              disabled={isProcessingPayroll}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-1 rounded-2xl px-6"
            >
              {isProcessingPayroll ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Banknote className="mr-2 h-5 w-5" />}
              {isProcessingPayroll ? 'Calcul en cours...' : 'Lancer la Paie Mensuelle'}
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <StatCard 
            title="Masse Salariale" 
            value={formatCurrency(totalSalaryMass)} 
            icon={DollarSign} 
            loading={isLoading} 
            colorClass="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
          />
          <StatCard 
            title="Effectif Payé" 
            value={staffWithSalary.length} 
            icon={Users} 
            loading={isLoading} 
            colorClass="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
          />
          <StatCard 
            title="Salaire Moyen" 
            value={formatCurrency(averageSalary)} 
            icon={DollarSign} 
            loading={isLoading} 
            colorClass="bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
          />
        </div>

        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/40 dark:border-slate-800/40 p-6 rounded-[2.5rem] shadow-sm">
          <PayrollChart staff={staffWithSalary} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100/50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <History className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">Historique des Paies</CardTitle>
                  <CardDescription>Archive des exécutions mensuelles</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <PayrollHistoryTable
                payrollHistory={payrollHistory}
                isLoading={isLoading}
                onViewPayslips={handleViewPayslips}
              />
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100/50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">Personnel & Bulletins</CardTitle>
                  <CardDescription>Édition individuelle ou groupée</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <StaffPayrollList
                staffWithSalary={staffWithSalary}
                isLoading={isLoading}
                canManageBilling={!!canManageBilling}
                onGeneratePayslip={handleGeneratePayslip}
                onGenerateAllPayslips={handleGenerateAllPayslips}
                isBulkGenerating={isBulkGenerating}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Aperçu du Bulletin de paie</DialogTitle>
            <DialogDescription>
              Ceci est une prévisualisation basée sur les données enregistrées pour cet employé.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-2">
            {isGenerating ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <p>Génération du bulletin de paie...</p>
              </div>
            ) : payslipDetails ? (
              <PayslipPreview details={payslipDetails} />
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">La prévisualisation du bulletin n'a pas pu être générée.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkPayslipOpen} onOpenChange={setIsBulkPayslipOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Aperçu des Bulletins de Paie</DialogTitle>
            <DialogDescription>
              Prévisualisation de tous les bulletins générés.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-2">
            {isBulkGenerating ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <p>Génération des bulletins...</p>
              </div>
            ) : bulkPayslipDetails && bulkPayslipDetails.length > 0 ? (
              <BulkPayslipPreview detailsArray={bulkPayslipDetails} />
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Aucun bulletin n'a pu être généré.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

