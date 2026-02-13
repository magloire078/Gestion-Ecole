
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  type AuthError,
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Mail, Lock, Eye, EyeOff, ChevronRight, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/logo';


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

export default function ModernLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);
  const [activeField, setActiveField] = useState<'email' | 'password' | null>(null);
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
        title: "🎉 Connexion réussie",
        description: "Redirection vers votre espace personnel..."
      });
      router.push('/dashboard');
    } catch (error) {
      const authError = error as AuthError;
      console.error('Erreur de connexion:', authError.code);

      let errorMessage = 'Email ou mot de passe incorrect.';
      if (authError.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cet email.';
      } else if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        errorMessage = 'Mot de passe incorrect.';
      } else if (authError.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
      } else if (authError.code === 'auth/network-request-failed') {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion internet.';
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
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      await signInWithPopup(auth, provider);
      toast({
        title: "✅ Connexion Google réussie",
        description: "Redirection vers votre espace..."
      });
      router.push('/dashboard');
    } catch (error) {
      const authError = error as AuthError;
      console.error('Erreur Google:', authError.code);

      if (authError.code !== 'auth/popup-closed-by-user') {
        let errorMessage = 'Erreur de connexion avec Google.';
        if (authError.code === 'auth/popup-blocked') {
          errorMessage = 'La fenêtre popup a été bloquée. Autorisez les popups pour ce site.';
        } else if (authError.code === 'auth/unauthorized-domain') {
          errorMessage = 'Ce domaine n&apos;est pas autorisé pour la connexion Google.';
        }
        setError(errorMessage);
      }
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-premium mesh-gradient p-4 md:p-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-cyan-400/20 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">

        {/* Left Side - Hero/Brand (Hidden on mobile, visible on large screens) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden lg:flex flex-col justify-center p-12 text-foreground space-y-8"
        >
          <div>
            <Logo disableLink />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
              La gestion scolaire <br />
              <span className="text-gradient">réinventée.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Une plateforme complète, intuitive et performante pour piloter votre établissement avec excellence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-8">
            <div className="glass-card p-4 rounded-xl border-white/20 bg-white/5">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm">Interface Premium</h3>
              <p className="text-xs text-muted-foreground mt-1">Design moderne et fluide pour une expérience utilisateur inégalée.</p>
            </div>
            <div className="glass-card p-4 rounded-xl border-white/20 bg-white/5">
              <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 mb-3">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm">Sécurité Avancée</h3>
              <p className="text-xs text-muted-foreground mt-1">Vos données protégées par les meilleurs standards de l&apos;industrie.</p>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center"
        >
          <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl p-8 md:p-10 relative overflow-hidden group">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div className="text-center mb-8">
              <div className="lg:hidden flex justify-center mb-6">
                <Logo disableLink />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">De retour ?</h2>
              <p className="text-sm text-muted-foreground mt-2">Connectez-vous à votre espace administration.</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                >
                  <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium">Adresse email</Label>
                  <div className="relative group/input">
                    <Input
                      id="email"
                      type="email"
                      placeholder="directeur@ecole.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isProcessing || isGoogleProcessing}
                      className="pl-10 h-12 bg-background/50 border-input/50 focus:bg-background focus:ring-primary/20 transition-all rounded-xl"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Link href="/auth/forgot-password" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                      Oublié ?
                    </Link>
                  </div>
                  <div className="relative group/input">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isProcessing || isGoogleProcessing}
                      className="pl-10 pr-10 h-12 bg-background/50 border-input/50 focus:bg-background focus:ring-primary/20 transition-all rounded-xl"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none"
                disabled={isProcessing || isGoogleProcessing}
              >
                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Se connecter"}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background/0 backdrop-blur-sm px-2 text-muted-foreground font-medium">
                  Ou continuer avec
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleProcessing}
              className="w-full h-12 rounded-xl text-base font-medium border-border/50 bg-background/50 hover:bg-background hover:text-foreground hover:border-primary/30 transition-all"
            >
              {isGoogleProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}
              Google
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Pas encore de compte ?{' '}
              <Link href="/auth/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                S&apos;inscrire gratuitement
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}


