'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone, Mail, Info } from 'lucide-react';
import { motion } from 'framer-motion';

function PendingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const type = searchParams.get('type') || 'subscription';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-mesh-gradient p-4 relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400/20 rounded-full filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-400/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-300/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg z-10"
        >
            <Card className="glass-card overflow-hidden border-none shadow-2xl rounded-[32px]">
                <div className="h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />
                <CardHeader className="text-center pt-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mx-auto bg-blue-100 dark:bg-blue-900/30 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner"
                    >
                        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                    </motion.div>
                    <CardTitle className="text-3xl font-black font-outfit text-slate-800 dark:text-white">
                        Paiement en cours...
                    </CardTitle>
                    <p className="text-muted-foreground mt-2 font-medium">
                        Nous attendons la confirmation de votre paiement.
                    </p>
                </CardHeader>
                <CardContent className="space-y-8 pb-10 px-8">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/20">
                            <Smartphone className="h-6 w-6 text-blue-500 shrink-0 mt-1" />
                            <div className="text-sm">
                                <p className="font-bold text-blue-900 dark:text-blue-200">Vérifiez votre téléphone</p>
                                <p className="text-blue-700 dark:text-blue-300">Un message de confirmation a été envoyé sur votre mobile. Suivez les instructions pour valider la transaction.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <Info className="h-6 w-6 text-slate-500 shrink-0 mt-1" />
                            <div className="text-sm">
                                <p className="font-bold text-slate-700 dark:text-slate-200">Que se passe-t-il ensuite ?</p>
                                <p className="text-slate-500 dark:text-slate-400">Une fois validé, votre compte sera mis à jour automatiquement. Vous pouvez fermer cette page en toute sécurité.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            variant="outline"
                            className="w-full h-12 rounded-xl text-lg font-bold transition-all hover:scale-[1.02] border-slate-200 shadow-sm"
                            onClick={() => router.push(type === 'tuition' ? '/dashboard/frais-scolarite' : '/dashboard/parametres/abonnement')}
                        >
                            Retour à l&apos;application
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-mesh-gradient">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
      <PendingPageContent />
    </Suspense>
  );
}
