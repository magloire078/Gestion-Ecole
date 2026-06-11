'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, History, CreditCard, ExternalLink, Zap } from 'lucide-react';
import { applyPricing, calculateMonthlyUsage } from '@/lib/billing-calculator';
import { getPlanLimits } from '@/lib/subscription-plans';
import { useFirestore } from '@/firebase';
import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LocalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("BillingDashboard rendering error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="border-rose-200 bg-rose-50/20 backdrop-blur-xl rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-rose-600 flex items-center gap-2 font-black tracking-tight">
              <Zap className="h-5 w-5 animate-bounce" /> Erreur d'affichage
            </CardTitle>
            <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
              Une erreur s'est produite lors du rendu des informations de facturation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-600">
            <p className="text-sm">
              Il est possible que certaines données de votre abonnement ou de votre consommation soient incomplètes ou corrompues.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-slate-950 text-rose-400 rounded-xl text-xs font-mono overflow-auto max-h-40">
                {this.state.error.message || this.state.error.toString()}
              </pre>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl border-slate-200 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95">
              Réessayer
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default function BillingDashboard() {
  return (
    <LocalErrorBoundary>
      <BillingDashboardContent />
    </LocalErrorBoundary>
  );
}

function BillingDashboardContent() {
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

  const planDetails = getPlanLimits(subscription?.plan);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black tracking-tight"><Banknote className="h-5 w-5 text-indigo-600" /> Facturation</CardTitle>
          <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">Aperçu de votre facturation mensuelle et de votre consommation.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/4 rounded-xl" />
              <Skeleton className="h-6 w-1/2 rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : projection ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-slate-900">Prochaine Facture (Estimation)</h3>
                <div className="p-4 border rounded-xl bg-white/50">
                  <p className="text-sm text-slate-500">Total estimé pour ce mois</p>
                  <p className="text-4xl font-bold font-mono text-indigo-600">{formatCurrency(projection?.total ?? 0)}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Abonnement de base ({subscription?.plan ?? 'Essentiel'})</span><span className="font-mono">{formatCurrency(projection?.base ?? 0)}</span></div>
                  {(projection?.supplements?.modules ?? 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Modules complémentaires</span><span className="font-mono">{formatCurrency(projection.supplements.modules)}</span></div>}
                  {(projection?.supplements?.students ?? 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Supplément élèves</span><span className="font-mono">{formatCurrency(projection.supplements.students)}</span></div>}
                  {(projection?.supplements?.cycles ?? 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Supplément cycles</span><span className="font-mono">{formatCurrency(projection.supplements.cycles)}</span></div>}
                  <Separator className="opacity-50" />
                  <div className="flex justify-between font-semibold text-slate-900"><span>Total</span><span className="font-mono text-indigo-600">{formatCurrency(projection?.total ?? 0)}</span></div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-slate-900">Consommation actuelle</h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-xl bg-white/50">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Élèves actifs</p>
                    <p className="font-semibold font-mono text-slate-900">{usage?.studentsCount ?? 0} / {!Number.isFinite(planDetails?.maxStudents ?? Infinity) ? '∞' : planDetails?.maxStudents}</p>
                  </div>
                  <div className="p-3 border rounded-xl bg-white/50">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cycles actifs</p>
                    <p className="font-semibold font-mono text-slate-900">{usage?.cyclesCount ?? 0} / {!Number.isFinite(planDetails?.maxCycles ?? Infinity) ? '∞' : planDetails?.maxCycles}</p>
                  </div>
                </div>
                
                <div className="pt-2 space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white shadow-md rounded-xl transition-all hover:scale-105 active:scale-95"
                    onClick={() => {
                      if (!subscription || !projection) return;
                      const params = new URLSearchParams({
                        plan: subscription.plan || 'Essentiel',
                        price: (projection.total ?? 0).toString(),
                        description: `Renouvellement/Paiement ${subscription.plan || 'Essentiel'} pour ${schoolData?.name || 'votre établissement'}`,
                      }).toString();
                      router.push(`/dashboard/parametres/abonnement/paiement?${params}`);
                    }}
                    disabled={loading || !projection || (projection.total ?? 0) === 0}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Payer maintenant ({formatCurrency(projection?.total ?? 0)})
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl transition-all hover:scale-105 active:scale-95"
                    onClick={() => router.push('/dashboard/parametres/abonnement')}
                  >
                    <CreditCard className="mr-2 h-4 w-4 text-indigo-600" />
                    Gérer mon abonnement
                    <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 py-4 text-center">Données de facturation non disponibles.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black tracking-tight"><History className="h-5 w-5 text-indigo-600" /> Historique des factures</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Date</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Montant</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Statut</TableHead>
                <TableHead className="text-right text-xs font-black uppercase tracking-widest text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-slate-500">
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
