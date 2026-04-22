'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  
  const type = searchParams.get('type') || 'subscription';
  const schoolId = searchParams.get('schoolId');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    const redirectTimer = setTimeout(() => {
      if (type === 'tuition') {
        router.push('/dashboard/frais-scolarite');
      } else {
        router.push('/dashboard/parametres/abonnement');
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [router, type]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-mesh-gradient p-4 relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg z-10"
        >
            <Card className="glass-card overflow-hidden border-none shadow-2xl rounded-[32px]">
                <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
                <CardHeader className="text-center pt-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mx-auto bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner"
                    >
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                    </motion.div>
                    <CardTitle className="text-3xl font-black font-outfit text-slate-800 dark:text-white">
                        Paiement Réussi !
                    </CardTitle>
                    <p className="text-muted-foreground mt-2 font-medium">
                        Merci pour votre confiance. Votre opération a été traitée avec succès.
                    </p>
                </CardHeader>
                <CardContent className="space-y-8 pb-10 px-8">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest font-bold">Statut de la transaction</p>
                        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Confirmé
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-center text-sm text-muted-foreground">
                            Redirection automatique vers votre tableau de bord dans <span className="font-bold text-primary font-mono">{countdown}s</span>...
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                                className="flex-1 h-12 rounded-xl text-lg font-bold shadow-lg hover:shadow-primary/20 transition-all hover:scale-[1.02]"
                                onClick={() => router.push(type === 'tuition' ? '/dashboard/frais-scolarite' : '/dashboard/parametres/abonnement')}
                            >
                                Accéder au tableau de bord
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-mesh-gradient">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
