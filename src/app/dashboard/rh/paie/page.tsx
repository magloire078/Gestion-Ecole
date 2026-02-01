
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
    return query(collection(firestore, `ecoles/${schoolId}/personnel`), where('baseSalary', '>', 0));
  }, [firestore, schoolId]);

  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const staffWithSalary = useMemo(() => staffData?.map(doc => ({ id: doc.id, ...doc.data() as Staff & { id: string } })) || [], [staffData]);
  
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
    const total = staffWithSalary.reduce((acc, staff) => acc + (staff.baseSalary || 0), 0);
    return {
      totalSalaryMass: total,
      averageSalary: total / staffWithSalary.length,
    };
  }, [staffWithSalary]);

  const handleGeneratePayslip = async (staffMember: Staff) => {
    if (!schoolData) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Données de l\'école non chargées.'});
        return;
    }
    
    setIsGenerating(true);
    setPayslipDetails(null);
    setIsPayslipOpen(true);

    try {
        const fullStaffDoc = await getDoc(doc(firestore, `ecoles/${schoolId}/personnel/${staffMember.id!}`));
        if(!fullStaffDoc.exists()) throw new Error("Staff member not found");

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

        if(allDetails.length === 0) {
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
        
    } catch(e) {
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


  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Gestion de la Paie</h2>
              <p className="text-muted-foreground">Lancez et suivez la paie mensuelle de votre personnel.</p>
            </div>
            {canManageBilling && (
              <Button size="lg" onClick={handleRunPayroll} disabled={isProcessingPayroll}>
                 {isProcessingPayroll ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Banknote className="mr-2 h-5 w-5" />}
                 {isProcessingPayroll ? 'Lancement en cours...' : 'Lancer la Paie du Mois'}
              </Button>
            )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Masse Salariale Mensuelle" value={formatCurrency(totalSalaryMass)} icon={DollarSign} loading={isLoading} />
            <StatCard title="Employés sur la Paie" value={staffWithSalary.length} icon={Users} loading={isLoading} />
            <StatCard title="Salaire Moyen" value={formatCurrency(averageSalary)} icon={DollarSign} loading={isLoading} />
        </div>

        <PayrollChart staff={staffWithSalary} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/>Historique des Paies</CardTitle>
            <CardDescription>Consultez les lots de paie des mois précédents.</CardDescription>
          </CardHeader>
          <CardContent>
             <PayrollHistoryTable 
                payrollHistory={payrollHistory} 
                isLoading={isLoading} 
                onViewPayslips={handleViewPayslips} 
            />
          </CardContent>
        </Card>
            
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users />Personnel sur la Paie</CardTitle>
                <CardDescription>
                    Liste des employés avec un salaire de base défini.
                </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <Loader2 className="mr-2 h-8 w-8 animate-spin"/>
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
                      <Loader2 className="mr-2 h-8 w-8 animate-spin"/>
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
