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
import { School, Sparkles, Mail, Lock, Eye, EyeOff, ChevronRight, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';

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
          errorMessage = 'Ce domaine n\'est pas autorisé pour la connexion Google.';
        }
        setError(errorMessage);
      }
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Côté gauche - Illustration */}
      <div className="lg:w-1/2 bg-gradient-to-br from-primary to-blue-700 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors">
            <Image src={placeholderImages.mainAppLogo} alt="GèreEcole Logo" width={32} height={32} data-ai-hint="app logo"/>
            <span className="text-lg font-semibold">GèreEcole</span>
          </Link>
          
          <div className="mt-12 lg:mt-20 max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">LA SOLUTION DE RÉFÉRENCE</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Gérez vos établissements
              <span className="block text-white/90 mt-2">avec sérénité</span>
            </h1>
            
            <p className="text-lg text-white/80 mb-8">
              Rejoignez des centaines d'établissements qui simplifient leur gestion quotidienne avec GèreEcole.
            </p>
            
            <div className="space-y-4">
              {[
                "📊 Tableaux de bord personnalisés",
                "👥 Gestion centralisée des élèves",
                "💰 Suivi financier en temps réel",
                "📱 Accessible sur tous vos appareils"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-white/60" />
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="relative z-10 mt-8 lg:mt-0">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400'].map((color, i) => (
                <div key={i} className={`h-8 w-8 rounded-full border-2 border-primary/50 ${color}`} />
              ))}
            </div>
            <div className="text-white/80 text-sm">
              <p className="font-medium">+500 établissements</p>
              <p className="text-white/60">nous font déjà confiance</p>
            </div>
          </div>
        </div>
        
        {/* Effets décoratifs */}
        <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Côté droit - Formulaire */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* En-tête */}
          <div className="text-center space-y-2">
            <Image src={placeholderImages.mainAppLogo} alt="GèreEcole Logo" width={56} height={56} className="mx-auto mb-4" data-ai-hint="app logo" />
            <h2 className="text-3xl font-bold tracking-tight">
              Bienvenue à bord
            </h2>
            <p className="text-muted-foreground">
              Connectez-vous pour accéder à votre espace de gestion
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulaire */}
          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className={`relative transition-all duration-200 ${activeField === 'email' ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@ecole.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setActiveField('email')}
                    onBlur={() => setActiveField(null)}
                    disabled={isProcessing || isGoogleProcessing}
                    className="h-12 pl-10 text-base transition-all"
                    autoComplete="email"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs font-normal"
                    asChild
                    type="button"
                  >
                    <Link href="/auth/forgot-password">
                      Mot de passe oublié ?
                    </Link>
                  </Button>
                </div>
                <div className={`relative transition-all duration-200 ${activeField === 'password' ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setActiveField('password')}
                    onBlur={() => setActiveField(null)}
                    disabled={isProcessing || isGoogleProcessing}
                    className="h-12 pl-10 pr-10 text-base"
                    autoComplete="current-password"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isProcessing || isGoogleProcessing}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Bouton de connexion */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isProcessing || isGoogleProcessing || !email || !password}
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">
                Ou continuer avec
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium rounded-xl border-2 hover:border-primary/50 transition-all duration-300"
            onClick={handleGoogleSignIn}
            disabled={isProcessing || isGoogleProcessing}
            size="lg"
          >
            {isGoogleProcessing ? (
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            ) : (
              <>
                <GoogleIcon className="mr-3 h-5 w-5" />
                <span>Google</span>
              </>
            )}
          </Button>

          {/* Inscription */}
          <div className="text-center space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Nouveau sur GèreEcole ?{' '}
              <Button
                variant="link"
                className="p-0 h-auto text-sm font-semibold text-primary hover:text-primary/80"
                asChild
              >
                <Link href="/auth/register">
                  Créer un compte
                </Link>
              </Button>
            </p>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                En vous connectant, vous acceptez nos{' '}
                <Button variant="link" className="p-0 h-auto text-xs underline underline-offset-2" asChild>
                  <Link href="/terms">
                    Conditions
                  </Link>
                </Button>{' '}
                et notre{' '}
                <Button variant="link" className="p-0 h-auto text-xs underline underline-offset-2" asChild>
                  <Link href="/privacy">
                    Confidentialité
                  </Link>
                </Button>
              </p>
            </div>
          </div>

          {/* Version */}
          <div className="text-center pt-8">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} GèreEcole • v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
