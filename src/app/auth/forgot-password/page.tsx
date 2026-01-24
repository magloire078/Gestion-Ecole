'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, School } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModernForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }
    setIsProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSubmitted(true);
      toast({
        title: 'Email de réinitialisation envoyé',
        description: 'Veuillez consulter votre boîte de réception pour continuer.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'envoyer l'email. Vérifiez que l'adresse est correcte.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4">
              <School className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Mot de passe oublié ?
            </h2>
            <p className="text-muted-foreground">
              {isSubmitted 
                ? "Un lien a été envoyé à votre adresse email." 
                : "Pas de panique. Saisissez votre email pour recevoir un lien."
              }
            </p>
        </div>
          
        <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert variant="destructive" className="border-l-4 border-l-red-500">
                  <AlertDescription className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    {error}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
        </AnimatePresence>

        {isSubmitted ? (
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">Si un compte existe pour <strong>{email}</strong>, vous recevrez un email sous peu. Pensez à vérifier votre dossier de courriers indésirables.</p>
            </div>
        ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Adresse email
                    </Label>
                    <div className="relative">
                        <Input
                        id="email"
                        type="email"
                        placeholder="votre@ecole.fr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isProcessing}
                        className="h-12 pl-10 text-base"
                        autoComplete="email"
                        />
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isProcessing || !email}
                    size="lg"
                >
                    {isProcessing ? (
                        <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Envoi en cours...
                        </>
                    ) : (
                        "Envoyer le lien de réinitialisation"
                    )}
                </Button>
            </form>
        )}

        <div className="text-center">
             <Button
                variant="ghost"
                className="text-sm font-semibold text-primary hover:text-primary/80"
                asChild
              >
                <Link href="/auth/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la page de connexion
                </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
