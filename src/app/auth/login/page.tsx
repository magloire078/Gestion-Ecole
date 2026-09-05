'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  type AuthError,
} from 'firebase/auth';
import { useEffect } from 'react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, Zap } from 'lucide-react';
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setIsProcessing(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur votre espace GèreEcole."
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = 'Email ou mot de passe incorrect.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cet email.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Mot de passe incorrect.';
      } else if (error.message) {
        errorMessage = `${error.message} (${error.code || 'unknown'})`;
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue sur votre espace GèreEcole."
          });
          router.push('/dashboard');
        }
      } catch (error: any) {
        console.error("Redirect Error:", error);
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: error.message || "Une erreur est survenue lors de la connexion avec Google."
        });
      }
    };
    handleRedirect();
  }, [auth, router, toast]);

  const handleGoogleSignIn = async () => {
    setIsGoogleProcessing(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Use redirect directly to avoid COOP/COEP issues with popups
      await signInWithRedirect(auth, provider);

    } catch (error) {
      console.error("Google Sign-in error:", error);
      const authError = error as AuthError;
      setError('Erreur de connexion avec Google. Veuillez réessayer.');
      setIsGoogleProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-slate-900/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left: Branding & Value Proposition */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col space-y-5 p-6"
        >
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tight font-outfit text-balance">
              L'excellence <br />
              <span className="text-blue-600">académique</span> <br />
              commence ici.
            </h1>
            <p className="text-xl text-slate-500 max-w-md leading-relaxed">
              Pilotez votre établissement avec la plateforme la plus intuitive et performante du marché.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-white flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Sécurité Totale</h3>
                <p className="text-sm text-slate-500">Vos données sont protégées et cryptées.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-white flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Performance Instantanée</h3>
                <p className="text-sm text-slate-500">Accédez à vos rapports en un clin d'œil.</p>
              </div>
            </div>
          </div>

          {/* Decorative image on the left for premium feel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl border-4 border-white"
          >
            <Image
              src="/custom-assets/home-hero.jpg"
              alt="GèreEcole Dashboard Preview"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
          </motion.div>
        </motion.div>

        {/* Right: Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="perspective-1000 w-full"
        >
          <motion.div
            initial={{ rotateY: 5 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="w-full max-w-lg mx-auto bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-4 md:p-6 relative overflow-hidden group"
          >
            <AnimatedHighlight />

            <div className="flex flex-col items-center mb-5">
              <div className="mb-4">
                <Logo size="lg" />
              </div>
              <div className="text-center mt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-2">
                  <ShieldCheck className="h-3 w-3" /> Espace Sécurisé
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Connexion</h2>
                <p className="text-slate-500 mt-1 font-medium text-sm">Bon retour parmi nous !</p>
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
                  <Alert variant="destructive" className="bg-rose-50 border-rose-100 text-rose-600 rounded-xl">
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignIn} className="space-y-3 relative z-10">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email professionnel</Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@ecole.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isProcessing || isGoogleProcessing}
                    className="h-13 pl-11 bg-white/50 backdrop-blur-sm border-white/40 focus:bg-white focus:border-blue-600 transition-all rounded-xl font-medium shadow-sm"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-400">Mot de passe</Label>
                  <Link href="/auth/forgot-password" title="Réinitialiser" className="text-xs font-bold text-blue-600 hover:text-slate-900 transition-colors">
                    Oublié ?
                  </Link>
                </div>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isProcessing || isGoogleProcessing}
                    className="h-13 pl-11 pr-11 bg-white/50 backdrop-blur-sm border-white/40 focus:bg-white focus:border-blue-600 transition-all rounded-xl font-medium shadow-sm"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-14 rounded-xl text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isProcessing || isGoogleProcessing}
                >
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : "Se connecter"}
                </Button>
              </div>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200/50" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                <span className="bg-transparent px-4">Ou via Google</span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleProcessing}
              className="w-full h-14 rounded-xl bg-white/50 backdrop-blur-sm border-white/60 hover:bg-white hover:border-slate-200 transition-all font-bold text-slate-700 shadow-sm"
            >
              {isGoogleProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin mr-3" />
              ) : (
                <GoogleIcon className="mr-3" />
              )}
              Se connecter rapidement
            </Button>

            <p className="text-center text-sm font-medium text-slate-500 mt-6">
              Nouveau ici ?{' '}
              <Link href="/auth/register" className="text-slate-900 font-black hover:underline">
                Créer un compte d'école
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
