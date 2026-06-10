'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home, Loader2, LifeBuoy, MailQuestion } from 'lucide-react';
import { motion } from 'framer-motion';

const REASON_LABELS: Record<string, { title: string; description: string }> = {
  cancelled: {
    title: 'Paiement annulé',
    description: "Vous avez quitté la page de paiement avant la fin. Aucun montant n'a été débité.",
  },
  insufficient_funds: {
    title: 'Solde insuffisant',
    description: "Votre compte n'a pas les fonds nécessaires. Vérifiez votre solde et réessayez.",
  },
  declined: {
    title: 'Paiement refusé',
    description: 'Votre banque ou opérateur Mobile Money a refusé la transaction. Contactez-les si besoin.',
  },
  timeout: {
    title: 'Délai dépassé',
    description: 'La session de paiement a expiré. Aucun montant n\'a été prélevé.',
  },
  technical: {
    title: 'Erreur technique',
    description: 'Un incident technique est survenu chez le fournisseur. Réessayez dans quelques instants.',
  },
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  paydunya: 'PayDunya',
  genius: 'Genius Pay',
  wave: 'Wave',
  orangemoney: 'Orange Money',
  mtn: 'MTN MoMo',
};

function ErrorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get('type') || 'subscription';
  const reason = searchParams.get('reason') || 'cancelled';
  const provider = searchParams.get('provider');
  const plan = searchParams.get('plan');

  const reasonInfo = REASON_LABELS[reason] ?? REASON_LABELS.technical;
  const providerLabel = provider ? PROVIDER_LABELS[provider] : null;

  const retryHref = type === 'tuition'
    ? '/dashboard/frais-scolarite'
    : plan
      ? `/dashboard/parametres/abonnement/paiement?plan=${encodeURIComponent(plan)}`
      : '/dashboard/parametres/abonnement';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-mesh-gradient p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-red-400/20 rounded-full filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-400/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-rose-300/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg z-10"
      >
        <Card className="glass-card overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="h-2 bg-gradient-to-r from-red-400 to-orange-500" />
          <CardHeader className="text-center pt-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto bg-red-100 dark:bg-red-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner relative"
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-red-400/30"
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <AlertCircle className="h-10 w-10 text-red-500 relative" />
            </motion.div>
            <CardTitle className="text-3xl font-black font-outfit text-slate-800 dark:text-white">
              {reasonInfo.title}
            </CardTitle>
            <p className="text-muted-foreground mt-2 font-medium">
              {reasonInfo.description}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pb-10 px-8">
            <div className="rounded-2xl border border-red-100 dark:border-red-800/20 bg-red-50/60 dark:bg-red-900/10 p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-800/70 dark:text-red-300/70 uppercase tracking-wider font-bold text-xs">Type</span>
                <span className="font-semibold text-red-900 dark:text-red-200">
                  {type === 'tuition' ? 'Frais de scolarité' : 'Abonnement'}
                </span>
              </div>
              {providerLabel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-800/70 dark:text-red-300/70 uppercase tracking-wider font-bold text-xs">Fournisseur</span>
                  <span className="font-semibold text-red-900 dark:text-red-200">{providerLabel}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-800/70 dark:text-red-300/70 uppercase tracking-wider font-bold text-xs">Statut</span>
                <span className="font-semibold text-red-900 dark:text-red-200">Aucun débit</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold transition-all hover:scale-[1.02]"
                onClick={() => router.push(retryHref)}
              >
                <RefreshCcw className="mr-2 h-5 w-5" />
                Réessayer
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-bold transition-all hover:scale-[1.02] border-slate-200"
                onClick={() => router.push('/dashboard')}
              >
                <Home className="mr-2 h-5 w-5" />
                Accueil
              </Button>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4">
              <LifeBuoy className="h-5 w-5 shrink-0 text-slate-500 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800 mb-1">Besoin d'aide ?</p>
                <p>
                  Si le problème persiste, contactez notre support à{' '}
                  <a href="mailto:support@gereecole.com" className="font-semibold text-primary underline-offset-2 hover:underline">
                    support@gereecole.com
                  </a>{' '}
                  en précisant le fournisseur utilisé et l'heure de la tentative.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-mesh-gradient">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <ErrorPageContent />
    </Suspense>
  );
}
