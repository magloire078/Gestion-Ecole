'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, History, CreditCard, ExternalLink, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { applyPricing, calculateMonthlyUsage } from '@/lib/billing-calculator';
import { getPlanLimits } from '@/lib/subscription-plans';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { doc, DocumentReference } from 'firebase/firestore';
import { motion } from 'framer-motion';
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
import type { SchoolData } from '@/providers/school-provider';

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
  const { schoolId: contextSchoolId, schoolData: contextSchoolData, subscription: contextSubscription, loading: schoolLoading, reloadUser } = useSchoolData();
  const { user, schoolId: userSchoolId, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Identifier l'école avec résilience
  const effectiveSchoolId = contextSchoolId || userSchoolId || user?.schoolId;

  // Souscription Firestore directe en cas de délai de propagation
  const schoolDocRef = useMemo(() => {
    if (!firestore || !effectiveSchoolId) return null;
    return doc(firestore, 'ecoles', effectiveSchoolId) as DocumentReference<SchoolData>;
  }, [firestore, effectiveSchoolId]);

  const { data: directSchoolData, loading: directDocLoading } = useDoc<SchoolData>(schoolDocRef);

  const effectiveSchoolData = contextSchoolData || directSchoolData;
  const effectiveSubscription = effectiveSchoolData?.subscription || contextSubscription;
  const schoolName = effectiveSchoolData?.name || 'votre établissement';

  const [usage, setUsage] = useState<{ studentsCount: number; cyclesCount: number; storageUsed: number } | null>(null);
  const [projection, setProjection] = useState<any | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveSchoolId || !firestore || !effectiveSubscription?.plan) return;
    let cancelled = false;
    const run = async () => {
      setBillingLoading(true);
      setBillingError(null);
      try {
        const currentUsage = await calculateMonthlyUsage(firestore, effectiveSchoolId);
        if (cancelled) return;
        setUsage(currentUsage);
        const billingProjection = await applyPricing(effectiveSubscription as any, currentUsage);
        if (cancelled) return;
        setProjection(billingProjection);
      } catch (error: any) {
        if (cancelled) return;
        console.error("Failed to calculate billing data:", error);
        setBillingError(error?.message ?? 'Erreur de calcul de la facturation.');
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [effectiveSchoolId, firestore, effectiveSubscription]);

  const planDetails = getPlanLimits(effectiveSubscription?.plan);
  const isSchoolResolving = (schoolLoading || userLoading || (directDocLoading && !effectiveSchoolData)) && !effectiveSchoolData;
  const showSkeleton = isSchoolResolving || (!!effectiveSubscription?.plan && (billingLoading || (!projection && !billingError)));
  const hasSubscription = !!effectiveSubscription?.plan;

  if (!effectiveSchoolId && !isSchoolResolving) {
    return (
      <Card className="max-w-xl mx-auto my-8 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-border/60 shadow-xl text-center">
        <CardContent className="p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Établissement non sélectionné</h2>
          <p className="text-sm text-slate-500">
            Impossible d'accéder aux données de facturation. Veuillez sélectionner un établissement ou recharger votre session.
          </p>
          <div className="pt-2">
            <Button onClick={() => reloadUser?.()} variant="outline" className="rounded-xl gap-2 hover:scale-105 active:scale-95 transition-all">
              <RefreshCw className="w-4 h-4" />
              Recharger
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-border/60 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black tracking-tight text-slate-900 dark:text-white">
            <Banknote className="h-5 w-5 text-indigo-600" /> Facturation
          </CardTitle>
          <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
            Aperçu de votre facturation mensuelle et de votre consommation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSkeleton ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/4 rounded-xl" />
              <Skeleton className="h-6 w-1/2 rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : !hasSubscription ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">Aucun abonnement actif</p>
                <p className="text-sm text-slate-500">Choisissez un plan adapté à votre établissement pour débloquer toutes les fonctionnalités.</p>
              </div>
              <Button 
                onClick={() => router.push('/dashboard/parametres/abonnement')} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                <CreditCard className="mr-2 h-4 w-4" /> Choisir un plan
              </Button>
            </div>
          ) : billingError ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-rose-600 font-semibold">Erreur de calcul de la facturation</p>
              <p className="text-xs text-slate-500">{billingError}</p>
            </div>
          ) : projection ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Prochaine Facture (Estimation)</h3>
                <div className="p-4 border border-indigo-100 dark:border-indigo-950 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Total estimé pour ce mois</p>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(projection?.total ?? 0)}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Abonnement de base ({effectiveSubscription?.plan ?? 'Essentiel'})</span>
                    <span className="font-mono font-semibold">{formatCurrency(projection?.base ?? 0)}</span>
                  </div>
                  {(projection?.supplements?.modules ?? 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Modules complémentaires</span>
                      <span className="font-mono font-semibold">{formatCurrency(projection.supplements.modules)}</span>
                    </div>
                  )}
                  {(projection?.supplements?.students ?? 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Supplément élèves</span>
                      <span className="font-mono font-semibold">{formatCurrency(projection.supplements.students)}</span>
                    </div>
                  )}
                  {(projection?.supplements?.cycles ?? 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Supplément cycles</span>
                      <span className="font-mono font-semibold">{formatCurrency(projection.supplements.cycles)}</span>
                    </div>
                  )}
                  <Separator className="my-2 opacity-50" />
                  <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-1">
                    <span>Total</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatCurrency(projection?.total ?? 0)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Consommation actuelle</h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Élèves actifs</p>
                    <p className="font-semibold font-mono text-slate-900 dark:text-slate-100 text-lg mt-0.5">
                      {usage?.studentsCount ?? 0} / {!Number.isFinite(planDetails?.maxStudents ?? Infinity) ? '∞' : planDetails?.maxStudents}
                    </p>
                  </div>
                  <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cycles actifs</p>
                    <p className="font-semibold font-mono text-slate-900 dark:text-slate-100 text-lg mt-0.5">
                      {usage?.cyclesCount ?? 0} / {!Number.isFinite(planDetails?.maxCycles ?? Infinity) ? '∞' : planDetails?.maxCycles}
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-600/20 rounded-xl transition-all hover:scale-105 active:scale-95"
                    onClick={() => {
                      if (!effectiveSubscription || !projection) return;
                      const params = new URLSearchParams({
                        plan: effectiveSubscription.plan || 'Essentiel',
                        price: (projection.total ?? 0).toString(),
                        description: `Renouvellement/Paiement ${effectiveSubscription.plan || 'Essentiel'} pour ${schoolName}`,
                      }).toString();
                      router.push(`/dashboard/parametres/abonnement/paiement?${params}`);
                    }}
                    disabled={showSkeleton || !projection || (projection.total ?? 0) === 0}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Payer maintenant ({formatCurrency(projection?.total ?? 0)})
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl transition-all hover:scale-105 active:scale-95 border-border/60"
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

      <Card className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-border/60 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black tracking-tight text-slate-900 dark:text-white">
            <History className="h-5 w-5 text-indigo-600" /> Historique des factures
          </CardTitle>
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
              {showSkeleton ? (
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
    </motion.div>
  );
}

