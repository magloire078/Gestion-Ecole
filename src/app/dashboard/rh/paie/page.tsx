
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Banknote, Loader2, Files, Users, DollarSign, History } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { staff as Staff, school as OrganizationSettings } from '@/lib/data-types';
import { getPayslipDetails, type PayslipDetails } from '@/lib/bulletin-de-paie';
import { PayslipPreview, BulkPayslipPreview } from '@/components/payroll/payslip-template';
import { PayrollChart } from '@/components/rh/payroll-chart';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';


const StatCard = ({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: React.ElementType, loading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

const MOCK_PAYROLL_HISTORY = [
    { id: 'paie_juillet_2024', period: 'Juillet 2024', executionDate: '2024-07-31', totalMass: 8550000, status: 'Terminé' },
    { id: 'paie_juin_2024', period: 'Juin 2024', executionDate: '2024-06-30', totalMass: 8495000, status: 'Terminé' },
    { id: 'paie_mai_2024', period: 'Mai 2024', executionDate: '2024-05-31', totalMass: 8495000, status: 'Terminé' },
];

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


  const staffQuery = useMemo(() => {
    if (!schoolId) return null;
    return query(collection(firestore, `ecoles/${schoolId}/personnel`), where('baseSalary', '>', 0));
  }, [firestore, schoolId]);

  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const staffWithSalary = useMemo(() => staffData?.map(doc => ({ id: doc.id, ...doc.data() } as Staff & { id: string })) || [], [staffData]);

  const isLoading = schoolLoading || userLoading || staffLoading;
  
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
        const details = await getPayslipDetails(fullStaffDoc.data() as Staff, payslipDate, schoolData as OrganizationSettings);
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
                return getPayslipDetails(fullStaffDoc.data() as Staff, payslipDate, schoolData as OrganizationSettings);
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
              <Button size="lg" disabled>
                <Banknote className="mr-2 h-5 w-5" />
                Lancer la Paie du Mois
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
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead>Date d'exécution</TableHead>
                        <TableHead>Masse Salariale</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PAYROLL_HISTORY.map((run) => (
                    <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.period}</TableCell>
                        <TableCell>{format(new Date(run.executionDate), 'dd/MM/yyyy', {locale: fr})}</TableCell>
                        <TableCell>{formatCurrency(run.totalMass)}</TableCell>
                        <TableCell><Badge variant="secondary">{run.status}</Badge></TableCell>
                        <TableCell className="text-right">
                           <Button variant="outline" size="sm" onClick={handleGenerateAllPayslips}>
                             <Files className="mr-2 h-4 w-4" /> Voir les bulletins
                           </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
            
        <Card>
            <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                <CardTitle className="flex items-center gap-2"><Users />Personnel sur la Paie</CardTitle>
                <CardDescription>
                    Liste des employés avec un salaire de base défini.
                </CardDescription>
                </div>
                {canManageBilling && staffWithSalary.length > 0 && (
                    <Button onClick={handleGenerateAllPayslips} disabled={isBulkGenerating} variant="secondary">
                        {isBulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Files className="mr-2 h-4 w-4" />}
                        {isBulkGenerating ? 'Génération...' : 'Générer Tous les Bulletins'}
                    </Button>
                )}
            </div>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Salaire de Base</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                    </TableRow>
                    ))
                ) : staffWithSalary.length > 0 ? (
                    staffWithSalary.map(staff => (
                    <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.firstName} {staff.lastName}</TableCell>
                        <TableCell className="capitalize">{staff.role}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(staff.baseSalary)}</TableCell>
                        <TableCell>
                        <Badge variant={staff.status === 'Actif' ? 'secondary' : 'outline'}>{staff.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        {canManageBilling && (
                            <Button variant="outline" size="sm" onClick={() => handleGeneratePayslip(staff)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Générer Bulletin
                            </Button>
                        )}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">Aucun membre du personnel avec un salaire défini.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
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
