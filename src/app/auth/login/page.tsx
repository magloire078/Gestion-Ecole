
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="24px"
      height="24px"
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
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Champs requis' });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // La redirection est gérée par le AuthGuard
      toast({ 
        title: 'Connexion réussie', 
        description: 'Redirection en cours...' 
      });
      // Le AuthGuard s'occupera de la redirection
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      
      let errorMessage = 'Email ou mot de passe incorrect.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cet email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mot de passe incorrect.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
      }
      
      toast({ 
        variant: 'destructive', 
        title: 'Erreur de connexion', 
        description: errorMessage 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await signInWithPopup(auth, provider);
      toast({ 
        title: 'Connexion réussie', 
        description: 'Redirection en cours...' 
      });
      // La redirection est gérée par le AuthGuard
    } catch (error: any) {
      console.error('Erreur Google:', error);
      
      let errorMessage = 'Erreur de connexion avec Google.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'La fenêtre de connexion a été fermée.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'La fenêtre popup a été bloquée. Autorisez les popups pour ce site.';
      }
      
      toast({ 
        variant: 'destructive', 
        title: 'Erreur de connexion avec Google',
        description: errorMessage 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Accédez à votre espace GèreEcole
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSignIn}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="votre@email.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={isProcessing}
                autoComplete="email"
              />
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs"
                  asChild
                  type="button"
                >
                  <Link href="/auth/forgot-password">
                    Mot de passe oublié ?
                  </Link>
                </Button>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={isProcessing}
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isProcessing || !email || !password}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </CardFooter>
        </form>
        
        <div className="relative px-6 pt-2">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-1 bg-card px-2 text-xs text-muted-foreground">
            OU
          </span>
        </div>
        
        <div className="px-6 pb-6 flex flex-col gap-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn} 
            disabled={isProcessing}
            type="button"
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continuer avec Google
          </Button>
          
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link href="/auth/register">Créez-en un</Link>
            </Button>
          </p>
          
          <div className="text-center text-xs text-muted-foreground">
            En vous connectant, vous acceptez nos{' '}
            <Button variant="link" className="p-0 h-auto text-xs" asChild>
              <Link href="/terms">Conditions d'utilisation</Link>
            </Button>{' '}
            et notre{' '}
            <Button variant="link" className="p-0 h-auto text-xs" asChild>
              <Link href="/privacy">Politique de confidentialité</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
