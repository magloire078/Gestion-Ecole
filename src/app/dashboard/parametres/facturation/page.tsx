'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, History, CreditCard, ExternalLink, Zap } from 'lucide-react';
import { applyPricing, calculateMonthlyUsage, TARIFAIRE } from '@/lib/billing-calculator';
import { useFirestore } from '@/firebase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from '@/lib/currency-utils';


export default function BillingDashboard() {
  const { schoolId, schoolData, subscription, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const router = useRouter();
  const [usage, setUsage] = useState<{ studentsCount: number; cyclesCount: number; storageUsed: number } | null>(null);
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
                  <p className="text-4xl font-bold">{formatCurrency(projection.total)}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Abonnement de base ({subscription?.plan})</span><span>{formatCurrency(projection.base)}</span></div>
                  {projection.supplements.modules > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Modules complémentaires</span><span>{formatCurrency(projection.supplements.modules)}</span></div>}
                  {projection.supplements.students > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Supplément élèves</span><span>{formatCurrency(projection.supplements.students)}</span></div>}
                  {projection.supplements.cycles > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Supplément cycles</span><span>{formatCurrency(projection.supplements.cycles)}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(projection.total)}</span></div>
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
                
                <div className="pt-2 space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md"
                    onClick={() => {
                      if (!subscription || !projection) return;
                      const params = new URLSearchParams({
                        plan: subscription.plan || 'Essentiel',
                        price: projection.total.toString(),
                        description: `Renouvellement/Paiement ${subscription.plan} pour ${schoolData?.name || 'votre établissement'}`,
                      }).toString();
                      router.push(`/dashboard/parametres/abonnement/paiement?${params}`);
                    }}
                    disabled={loading || !projection || projection.total === 0}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Payer maintenant ({formatCurrency(projection?.total)})
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/parametres/abonnement')}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Gérer mon abonnement
                    <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
                  </Button>
                </div>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Aucun historique de facture disponible.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
