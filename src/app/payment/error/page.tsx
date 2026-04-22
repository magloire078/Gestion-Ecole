'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function ErrorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const type = searchParams.get('type') || 'subscription';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-mesh-gradient p-4 relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-red-400/20 rounded-full filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-400/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-300/20 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

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
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mx-auto bg-red-100 dark:bg-red-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner"
                    >
                        <AlertCircle className="h-10 w-10 text-red-500" />
                    </motion.div>
                    <CardTitle className="text-3xl font-black font-outfit text-slate-800 dark:text-white">
                        Paiement Échoué
                    </CardTitle>
                    <p className="text-muted-foreground mt-2 font-medium">
                        Désolé, nous n&apos;avons pas pu traiter votre paiement pour le moment.
                    </p>
                </CardHeader>
                <CardContent className="space-y-8 pb-10 px-8">
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-100 dark:border-red-800/20 text-center">
                        <p className="text-sm text-red-800 dark:text-red-400 font-medium">
                            Aucun montant n&apos;a été débité de votre compte. Cela peut être dû à une annulation, un solde insuffisant ou un problème technique avec le fournisseur.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                            className="flex-1 h-12 rounded-xl border-none bg-orange-500 hover:bg-orange-600 font-bold transition-all hover:scale-[1.02]"
                            onClick={() => router.push(type === 'tuition' ? '/dashboard/frais-scolarite' : '/dashboard/parametres/abonnement')}
                        >
                            <RefreshCcw className="mr-2 h-5 w-5" />
                            Réessayer
                        </Button>
                        <Button 
                            variant="outline"
                            className="flex-1 h-12 rounded-xl text-lg font-bold transition-all hover:scale-[1.02] border-slate-200"
                            onClick={() => router.push('/dashboard')}
                        >
                            <Home className="mr-2 h-5 w-5" />
                            Retour
                        </Button>
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
