'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSchoolData } from '@/hooks/use-school-data';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, FileText, Download, History, CreditCard } from 'lucide-react';
import { applyPricing, calculateMonthlyUsage, TARIFAIRE } from '@/lib/billing-calculator';
import { useFirestore } from '@/firebase';
import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function BillingDashboard() {
  const { schoolId, schoolData, subscription, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();

  const [usage, setUsage] = useState<{ studentsCount: number; cyclesCount: number } | null>(null);
  const [projection, setProjection] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolId && firestore && subscription) {
      const getBillingData = async () => {
        setLoading(true);
        try {
          const currentUsage = await calculateMonthlyUsage(firestore, schoolId);
          setUsage(currentUsage);
          const billingProjection = await applyPricing(subscription, currentUsage);
          setProjection(billingProjection);
        } catch (error) {
          console.error("Failed to calculate billing data:", error);
        } finally {
          setLoading(false);
        }
      };
      getBillingData();
    } else if (!schoolLoading) {
      setLoading(false);
    }
  }, [schoolId, firestore, subscription, schoolLoading]);
  
  const planDetails = subscription?.plan ? TARIFAIRE[subscription.plan] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Facturation</CardTitle>
          <CardDescription>Aperçu de votre facturation mensuelle et de votre consommation.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : projection ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                 <h3 className="font-semibold text-lg">Prochaine Facture (Estimation)</h3>
                 <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total estimé pour ce mois</p>
                    <p className="text-4xl font-bold">{projection.total.toLocaleString('fr-FR')} CFA</p>
                 </div>
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Abonnement de base ({subscription?.plan})</span><span>{projection.base.toLocaleString('fr-FR')} CFA</span></div>
                    {projection.supplements.modules > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Modules complémentaires</span><span>{projection.supplements.modules.toLocaleString('fr-FR')} CFA</span></div>}
                    {projection.supplements.students > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Supplément élèves</span><span>{projection.supplements.students.toLocaleString('fr-FR')} CFA</span></div>}
                    {projection.supplements.cycles > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Supplément cycles</span><span>{projection.supplements.cycles.toLocaleString('fr-FR')} CFA</span></div>}
                    <Separator />
                    <div className="flex justify-between font-semibold"><span>Total</span><span>{projection.total.toLocaleString('fr-FR')} CFA</span></div>
                 </div>
              </div>
              <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Consommation actuelle</h3>
                  <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Élèves actifs</p>
                        <p className="font-semibold">{usage?.studentsCount} / {planDetails?.elevesInclus === Infinity ? '∞' : planDetails?.elevesInclus}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Cycles actifs</p>
                        <p className="font-semibold">{usage?.cyclesCount} / {planDetails?.cyclesInclus === Infinity ? '∞' : planDetails?.cyclesInclus}</p>
                      </div>
                  </div>
                   <Button variant="outline" className="w-full" asChild><a href="mailto:support@gereecole.com"><CreditCard className="mr-2 h-4 w-4"/>Gérer mes informations de paiement</a></Button>
              </div>
            </div>
          ) : (
            <p>Données de facturation non disponibles.</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Historique des factures</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      <TableRow>
                          <TableCell>1er Juillet 2024</TableCell>
                          <TableCell>49 900 CFA</TableCell>
                          <TableCell><Badge variant="secondary">Payée</Badge></TableCell>
                          <TableCell className="text-right"><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Télécharger</Button></TableCell>
                      </TableRow>
                       <TableRow>
                          <TableCell>1er Juin 2024</TableCell>
                          <TableCell>49 900 CFA</TableCell>
                          <TableCell><Badge variant="secondary">Payée</Badge></TableCell>
                           <TableCell className="text-right"><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Télécharger</Button></TableCell>
                      </TableRow>
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </div>
  );
}
