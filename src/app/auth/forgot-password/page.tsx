'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Mail, ArrowLeft, ShieldKeyhole, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/logo';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
        title: 'Lien envoyé',
        description: 'Vérifiez votre boîte de réception.',
      });
    } catch (error) {
      setError("Impossible d'envoyer l'email. Vérifiez l'adresse saisie.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8faff] p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#2D9CDB]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#0C365A]/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left: Illustration & Context */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col space-y-10 p-12"
        >
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-[#0C365A] leading-[1.1] tracking-tighter font-outfit">
              Un accès <br />
              <span className="text-[#2D9CDB]">Sécurisé</span> <br />
              et simple.
            </h1>
            <p className="text-xl text-slate-500 max-w-md leading-relaxed">
              Ne perdez plus de temps. Récupérez vos accès en quelques secondes pour continuer à piloter votre école.
            </p>
          </div>

          {/* Decorative image for premium feel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-white/50"
          >
            <Image
              src="/custom-assets/home-hero.jpg"
              alt="Security Infrastructure"
              fill
              className="object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C365A]/60 to-transparent flex items-center p-8">
              <div className="max-w-xs">
                <ShieldKeyhole className="h-12 w-12 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white">Protection des données</h2>
                <p className="text-white/70 text-sm mt-2">Votre sécurité est notre priorité absolue. Nous utilisons les derniers standards de cryptage Firebase.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Reset Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="perspective-1000 w-full"
        >
          <motion.div
            initial={{ rotateX: 5 }}
            animate={{ rotateX: 0 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="w-full max-w-md mx-auto bg-white rounded-[40px] shadow-[0_40px_100px_rgba(12,54,90,0.1)] border border-blue-50/50 p-10 md:p-12 relative overflow-hidden group"
          >
            <AnimatedHighlight />

            <div className="flex flex-col items-center mb-10">
              <div className="mb-6 transform scale-150 py-4 transition-transform hover:scale-[1.6]">
                <Logo compact />
              </div>
              <div className="text-center mt-4">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-50 mb-4 text-[#2D9CDB]">
                  <HelpCircle className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-black text-[#0C365A] font-outfit tracking-tight">Accès oublié ?</h2>
                <p className="text-slate-400 mt-2 font-medium">Récupérez votre compte en un instant.</p>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
                  <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-2xl">
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-8 bg-blue-50 rounded-[30px] border border-blue-100/50 relative z-10"
              >
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center text-[#2D9CDB] mx-auto mb-4 shadow-sm">
                  <Mail className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-[#0C365A] mb-2">Vérifiez vos emails</h3>
                <p className="text-sm text-slate-500 font-medium">Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
                <Button variant="link" onClick={() => setIsSubmitted(false)} className="mt-4 text-[#2D9CDB] font-bold hover:text-[#0C365A]">Réessayer avec un autre email</Button>
              </motion.div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Email du compte</Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="nom@ecole.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isProcessing}
                      className="h-14 pl-12 bg-slate-50 border-transparent focus:bg-white focus:border-[#2D9CDB] transition-all rounded-2xl font-medium"
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-[#2D9CDB] transition-colors" />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-[#0C365A] hover:bg-[#0C365A]/90 text-white shadow-xl shadow-blue-900/10 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isProcessing || !email}
                >
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : "Envoyer le lien"}
                </Button>
              </form>
            )}

            <div className="mt-10 text-center relative z-10">
              <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#2D9CDB] hover:text-[#0C365A] transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
