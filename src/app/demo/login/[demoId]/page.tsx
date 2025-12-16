
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- Mock API Layer ---
async function validateDemoAccount(demoId: string) {
    console.log("Validating demo account:", demoId);
    if (demoId === 'expired-demo-id') {
      throw new Error('Ce compte démo a expiré.');
    }
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { id: demoId, status: 'active' };
}

async function createDemoSession(demoId: string) {
    console.log("Creating session for:", demoId);
    await new Promise(resolve => setTimeout(resolve, 500));
    return `session_token_for_${demoId}`;
}
// --- End Mock API Layer ---

function DemoAutoLoginContent() {
  const params = useParams();
  const router = useRouter();
  const demoId = params.demoId as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!demoId) {
        setStatus('error');
        setErrorMessage('ID de la démo manquant.');
        return;
    }

    const autoLogin = async () => {
      try {
        const demoAccount = await validateDemoAccount(demoId);
        if (!demoAccount || demoAccount.status !== 'active') {
          throw new Error('Ce compte démo a expiré ou est invalide.');
        }

        const sessionToken = await createDemoSession(demoAccount.id);
        localStorage.setItem('demo_token', sessionToken);
        localStorage.setItem('demo_account_id', demoAccount.id);
        
        router.push('/demo/dashboard');
        
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'Erreur de connexion à la démo');
      }
    };

    autoLogin();
  }, [demoId, router]);

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle className="text-center">Chargement de votre démo</CardTitle><CardDescription className="text-center">Préparation de l'environnement de démonstration...</CardDescription></CardHeader>
        <CardContent className="text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" /><p className="text-sm text-muted-foreground">Création des données fictives • Configuration du tableau de bord</p></CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle className="text-center">Erreur d'accès</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Impossible d'accéder à la démo</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>
          <Button className="w-full" onClick={() => router.push('/demo')}>Retour à la page démo</Button>
        </CardContent>
      </Card>
    );
  }

  return null; // Redirection en cours
}

export default function DemoAutoLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
            <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}>
                <DemoAutoLoginContent />
            </Suspense>
        </div>
    );
}
