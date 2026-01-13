'use client';

import { useState, useEffect } from 'react';
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
import { Logo } from '@/components/logo';
import { Loader2, User, Mail, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    
    setIsProcessing(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      toast({ 
        title: "✅ Compte créé avec succès", 
        description: "Redirection vers la configuration de votre école..." 
      });
      router.push('/onboarding/create-school');
    } catch (error) {
      const authError = error as AuthError;
      console.error('Erreur d\'inscription:', authError.code);
      
      let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = 'Cette adresse email est déjà utilisée.';
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible.';
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
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast({ 
        title: "✅ Connexion Google réussie", 
        description: "Redirection vers la configuration de votre école..." 
      });
      router.push('/onboarding');
    } catch (error) {
      const authError = error as AuthError;
      console.error('Erreur Google:', authError.code);
      if (authError.code !== 'auth/popup-closed-by-user') {
        setError('Erreur de connexion avec Google.');
      }
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>
            Commencez votre aventure avec GèreEcole.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleRegister}>
          <CardContent className="grid gap-4">
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="displayName"><User className="inline h-3 w-3 mr-1"/>Nom complet</Label>
              <Input 
                id="displayName" 
                type="text" 
                placeholder="Jean Dupont"
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                required 
                disabled={isProcessing || isGoogleProcessing}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email"><Mail className="inline h-3 w-3 mr-1"/>Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="votre@email.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={isProcessing || isGoogleProcessing}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password"><Lock className="inline h-3 w-3 mr-1"/>Mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="6+ caractères"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={isProcessing || isGoogleProcessing}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isProcessing || isGoogleProcessing}
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Créer mon compte
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">OU</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn} 
              disabled={isProcessing || isGoogleProcessing}
              type="button"
            >
              {isGoogleProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
              S'inscrire avec Google
            </Button>
          </CardFooter>
        </form>
        
        <div className="px-6 pb-6 text-center">
            <p className="text-sm text-muted-foreground">
                Déjà un compte ?{' '}
                <Button variant="link" className="p-0 h-auto" asChild>
                    <Link href="/auth/login">Se connecter</Link>
                </Button>
            </p>
        </div>
      </Card>
    </div>
  );
}
