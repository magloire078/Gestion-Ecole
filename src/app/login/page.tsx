
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
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
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

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

const actionCodeSettings = {
  url: 'http://localhost:9002/login', // URL to redirect back to
  handleCodeInApp: true,
};


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, loading } = useUser();
  const { toast } = useToast();

  // Effect to handle the magic link sign-in on component mount
  useEffect(() => {
    if (auth && isSignInWithEmailLink(auth, window.location.href)) {
      setIsProcessing(true);
      let emailFromStorage = window.localStorage.getItem('emailForSignIn');
      if (!emailFromStorage) {
        // User opened the link on a different device. To prevent session fixation
        // attacks, ask the user to provide the email again.
        emailFromStorage = window.prompt('Veuillez fournir votre email pour la confirmation');
      }
      
      if (emailFromStorage) {
        signInWithEmailLink(auth, emailFromStorage, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            toast({ title: 'Connexion réussie', description: 'Vous êtes maintenant connecté(e).' });
            router.push('/dashboard');
          })
          .catch((error) => {
            toast({ variant: 'destructive', title: 'Erreur de connexion', description: 'Le lien est peut-être invalide ou a expiré.' });
            setIsProcessing(false);
          });
      } else {
        setIsProcessing(false);
      }
    }
  }, [auth, router, toast]);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);


  if (loading || user || isProcessing) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold">{isProcessing ? 'Validation en cours...' : 'Chargement...'}</p>
                <p className="text-muted-foreground">{isProcessing ? 'Vérification du lien de connexion.' : 'Vérification de l\'authentification.'}</p>
            </div>
        </div>
      );
  }
  
  const handleMagicLinkSignIn = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Email requis', description: 'Veuillez saisir votre adresse e-mail.' });
      return;
    }
    setIsProcessing(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      toast({
        title: 'Lien de connexion envoyé',
        description: 'Veuillez consulter votre boîte de réception pour vous connecter.',
      });
      setEmail('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur d'envoi", description: "Une erreur est survenue. Veuillez réessayer." });
    } finally {
      setIsProcessing(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: 'Connexion réussie',
        description: 'Vous allez être redirigé vers le tableau de bord.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: 'Impossible de se connecter avec Google.',
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
          <CardTitle className="text-2xl">Accès à votre espace</CardTitle>
          <CardDescription>
            Connectez-vous sans mot de passe ou utilisez votre compte Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="directeur@ecole.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isProcessing}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button className="w-full" onClick={handleMagicLinkSignIn} disabled={isProcessing}>
            {isProcessing ? 'Envoi en cours...' : 'Recevoir un lien de connexion'}
          </Button>
          <div className="relative w-full">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-xs text-muted-foreground">OU</span>
          </div>
           <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isProcessing}>
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continuer avec Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
