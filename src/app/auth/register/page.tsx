'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  type AuthError,
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, User, Mail, Lock, Eye, EyeOff, CheckCircle2, Rocket, Star } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/logo';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="20px"
      height="20px"
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.45,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);

  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !displayName) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (!termsAccepted) {
      setError('Veuillez accepter les conditions d\'utilisation.');
      return;
    }

    setIsProcessing(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });

      toast({
        title: "Compte créé avec succès",
        description: "Préparation de votre espace établissement..."
      });
      router.push('/onboarding');
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = 'Cette adresse email est déjà utilisée.';
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleProcessing(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/onboarding');
    } catch (error) {
      setError('Erreur de connexion avec Google.');
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8faff] p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#2D9CDB]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#0C365A]/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left: Branding & Features */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col space-y-10 p-12"
        >
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-[#0C365A] leading-[1.1] tracking-tighter font-outfit text-balance">
              Prêt pour la <br />
              <span className="text-[#2D9CDB]">Révolution</span> <br />
              numérique ?
            </h1>
            <p className="text-xl text-slate-500 max-w-md leading-relaxed">
              Rejoignez les établissements qui transforment leur gestion quotidienne.
            </p>
          </div>

          <div className="space-y-4">
            {[
              "Audit de gestion en temps réel",
              "Portail parent & élève inclus",
              "Paiements en ligne sécurisés"
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="h-6 w-6 rounded-full bg-[#2D9CDB]/10 flex items-center justify-center text-[#2D9CDB]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="font-bold text-[#0C365A]/80">{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* Decorative image/illustration for premium feel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="relative w-full aspect-[4/3] rounded-[40px] overflow-hidden shadow-2xl shadow-blue-900/10 border-4 border-white"
          >
            <Image
              src="/custom-assets/home-hero.jpg"
              alt="GéreEcole Community"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#0C365A]/10 mix-blend-overlay" />
            <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-white/50">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-4 w-4 fill-[#2D9CDB] text-[#2D9CDB]" />)}
              </div>
              <p className="text-sm font-bold text-[#0C365A]">"GéreEcole a réduit notre temps administratif de 40% en un seul trimestre."</p>
              <p className="text-xs text-slate-500 mt-1">— Directrice d'établissement, Lyon</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Register Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="perspective-1000 w-full"
        >
          <motion.div
            initial={{ rotateY: -5 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="w-full max-w-lg mx-auto bg-white rounded-[40px] shadow-[0_40px_100px_rgba(12,54,90,0.1)] border border-blue-50/50 p-10 md:p-12 relative overflow-hidden group"
          >
            <AnimatedHighlight />

            <div className="flex flex-col items-center mb-10">
              <div className="mb-6 transform scale-150 py-4 transition-transform hover:scale-[1.6]">
                <Logo compact />
              </div>
              <div className="text-center mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2D9CDB] text-[10px] font-black uppercase tracking-widest mb-4">
                  <Rocket className="h-3 w-3" /> Essai Gratuit
                </div>
                <h2 className="text-3xl font-black text-[#0C365A] font-outfit tracking-tight">Rejoignez-nous</h2>
                <p className="text-slate-400 mt-2 font-medium text-sm">Démarrez votre transformation numérique.</p>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6"
                >
                  <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-2xl">
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-5 relative z-10">
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nom complet</Label>
                <div className="relative group">
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Jean Directeur"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isProcessing || isGoogleProcessing}
                    className="h-13 pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-[#2D9CDB] transition-all rounded-xl font-medium"
                  />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-300 group-focus-within:text-[#2D9CDB] transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email professionnel</Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="direction@ecole.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isProcessing || isGoogleProcessing}
                    className="h-13 pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-[#2D9CDB] transition-all rounded-xl font-medium"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-300 group-focus-within:text-[#2D9CDB] transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mot de passe</Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isProcessing || isGoogleProcessing}
                    className="h-13 pl-11 pr-11 bg-slate-50 border-transparent focus:bg-white focus:border-[#2D9CDB] transition-all rounded-xl font-medium"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-300 group-focus-within:text-[#2D9CDB] transition-colors" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded-lg border-slate-200 text-[#2D9CDB] focus:ring-[#2D9CDB] transition-all cursor-pointer"
                />
                <label htmlFor="terms" className="text-[10px] font-bold text-slate-400 leading-snug cursor-pointer select-none">
                  J'accepte les <Link href="/terms" className="text-[#2D9CDB] font-black hover:underline">conditions</Link> et la <Link href="/privacy" className="text-[#2D9CDB] font-black hover:underline">politique de confidentialité</Link>.
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-lg font-bold bg-[#2D9CDB] hover:bg-[#2D9CDB]/90 text-white shadow-xl shadow-blue-400/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={isProcessing || isGoogleProcessing || !termsAccepted}
              >
                {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : "Créer mon compte"}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-300">
                <span className="bg-white px-4">Ou via Google</span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleProcessing}
              className="w-full h-14 rounded-2xl border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all font-bold text-slate-600"
            >
              <GoogleIcon className="mr-3" /> S'inscrire rapidement
            </Button>

            <p className="text-center text-sm font-medium text-slate-400 mt-10">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="text-[#0C365A] font-bold hover:underline">
                Se connecter
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
